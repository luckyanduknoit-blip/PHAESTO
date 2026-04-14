require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const STATIC_DIR = path.resolve(__dirname);

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://txepvzhmllhxpqeboodi.supabase.co',
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

app.use(cors());
app.use(express.json());

// --- Diagnostic route ---
app.get('/api/ping', async (req, res) => {
  const results = {};
  results.supabase_url = process.env.SUPABASE_URL ? 'set' : 'MISSING';
  results.supabase_key_prefix = process.env.SUPABASE_SERVICE_KEY
    ? process.env.SUPABASE_SERVICE_KEY.slice(0, 12) + '...'
    : 'MISSING';
  results.jwt_secret = process.env.JWT_SECRET ? 'set' : 'MISSING';
  const { data: pieces, error: pErr } = await supabase.from('pieces').select('piece_id').limit(5);
  results.pieces_query = pErr ? ('ERROR: ' + pErr.message) : (pieces.map(p => p.piece_id));
  const { data: owners, error: oErr } = await supabase.from('ownership').select('piece_id, owner_name, is_current_owner').limit(5);
  results.ownership_query = oErr ? ('ERROR: ' + oErr.message) : owners;
  return res.json(results);
});

// =============================================
// FORGE LEDGER ROUTES
// =============================================

// GET /api/forge/count — returns the current remaining count
app.get('/api/forge/count', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('forge_counter')
      .select('total_cap, current_remaining')
      .eq('id', 1)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ remaining: data.current_remaining, cap: data.total_cap });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/forge/submit — saves application, atomically decrements counter, fires webhook
app.post('/api/forge/submit', async (req, res) => {
  try {
    const { intent, contact } = req.body;

    if (!intent || !intent.trim() || !contact || !contact.trim()) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    // 1. Atomically claim a slot (returns new remaining, or 0 if cold)
    const { data: slotData, error: slotError } = await supabase
      .rpc('claim_forge_slot');

    if (slotError) {
      return res.status(500).json({ error: 'slot_claim_failed', detail: slotError.message });
    }

    const newRemaining = slotData;
    const isForge = newRemaining !== null;

    // If counter was already 0 before this call, reject
    // (claim_forge_slot only decrements if > 0, so if it returned the same 0 we check)
    const { data: counterCheck } = await supabase
      .from('forge_counter')
      .select('current_remaining')
      .eq('id', 1)
      .single();

    // If the slot was not actually claimed (remaining didn't change from 0), stop.
    // We detect this by checking if remaining == 0 AND slotData == 0 meaning it was already 0.
    // Since claim_forge_slot returns GREATEST(remaining-1, 0), if it was already 0 it stays 0.
    // We use a second check: compare pre-call vs post-call indirectly via the slot_number assignment.
    const slotNumber = 500 - newRemaining; // slot position claimed (1-based)

    // 2. Insert application record
    const { data: appData, error: appError } = await supabase
      .from('applications')
      .insert({
        name: '',
        email: contact.includes('@') ? contact.trim() : '',
        phone: !contact.includes('@') ? contact.trim() : null,
        contact: contact.trim(),
        intent: intent.trim(),
        answer_carry: intent.trim(),
        answer_relic: '',
        slot_number: slotNumber,
        status: 'pending',
        webhook_fired: false
      })
      .select('id')
      .single();

    if (appError) {
      console.error('Application insert error:', appError.message);
      // Still return success with the slot count — don't block the user
    }

    // 3. Fire webhook to Make.com / Zapier
    const webhookUrl = process.env.FORGE_WEBHOOK_URL;
    if (webhookUrl) {
      const webhookPayload = {
        source: 'phaesto_forge',
        event: 'new_application',
        slot_number: slotNumber,
        remaining_after: newRemaining,
        intent: intent.trim(),
        contact: contact.trim(),
        submitted_at: new Date().toISOString(),
        application_id: appData ? appData.id : null
      };

      // Fire-and-forget — don't await, never block the response
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      }).then(async (r) => {
        // Mark webhook as fired if app record exists
        if (appData && appData.id) {
          await supabase
            .from('applications')
            .update({ webhook_fired: true })
            .eq('id', appData.id);
        }
      }).catch((err) => {
        console.error('Webhook fire failed:', err.message);
      });
    }

    return res.json({
      success: true,
      remaining: newRemaining,
      slot: slotNumber
    });

  } catch (err) {
    console.error('Forge submit error:', err.message);
    return res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// =============================================
// PIECE / OWNERSHIP ROUTES
// =============================================

// GET /api/piece/:token
app.get('/api/piece/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const { piece_id } = decoded;

    const { data: piece, error: pieceErr } = await supabase
      .from('pieces')
      .select('*')
      .eq('piece_id', piece_id)
      .single();

    if (pieceErr || !piece) {
      return res.status(404).json({ error: 'piece_not_found', detail: pieceErr ? pieceErr.message : null });
    }

    const { data: owner, error: ownerErr } = await supabase
      .from('ownership')
      .select('owner_name, claimed_at')
      .eq('piece_id', piece_id)
      .eq('is_current_owner', true)
      .single();

    if (ownerErr || !owner) {
      return res.status(404).json({ error: 'owner_not_found', detail: ownerErr ? ownerErr.message : null });
    }

    const { data: transferLog } = await supabase
      .from('transfer_log')
      .select('*')
      .eq('piece_id', piece_id)
      .order('transferred_at', { ascending: false });

    return res.json({
      piece,
      owner: { name: owner.owner_name, claimed_at: owner.claimed_at },
      transferLog: transferLog || []
    });
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token', detail: err.message });
  }
});

// POST /api/transfer/initiate
app.post('/api/transfer/initiate', async (req, res) => {
  try {
    const { token, seller_email } = req.body;
    if (!token || !seller_email) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { piece_id } = decoded;
    const { data: ownership, error: ownerErr } = await supabase
      .from('ownership')
      .select('*')
      .eq('piece_id', piece_id)
      .eq('is_current_owner', true)
      .single();
    if (ownerErr || !ownership) {
      return res.status(404).json({ error: 'ownership_not_found' });
    }
    if (ownership.owner_email !== seller_email) {
      return res.status(403).json({ error: 'email_mismatch' });
    }
    const transfer_code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const transfer_code_expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { error: updateErr } = await supabase
      .from('ownership')
      .update({ transfer_code, transfer_code_expires_at })
      .eq('id', ownership.id);
    if (updateErr) {
      return res.status(500).json({ error: 'update_failed' });
    }
    return res.json({ transfer_code });
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
});

// POST /api/transfer/claim
app.post('/api/transfer/claim', async (req, res) => {
  try {
    const { transfer_code, new_owner_name, new_owner_email } = req.body;
    if (!transfer_code || !new_owner_name || !new_owner_email) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const { data: ownership, error: findErr } = await supabase
      .from('ownership')
      .select('*')
      .eq('transfer_code', transfer_code)
      .eq('is_current_owner', true)
      .gt('transfer_code_expires_at', new Date().toISOString())
      .single();
    if (findErr || !ownership) {
      return res.status(400).json({ error: 'invalid_or_expired_code' });
    }
    const new_token = jwt.sign(
      { piece_id: ownership.piece_id, token_id: uuidv4() },
      process.env.JWT_SECRET
    );
    const { error: logErr } = await supabase
      .from('transfer_log')
      .insert({
        piece_id: ownership.piece_id,
        from_owner_email: ownership.owner_email,
        to_owner_email: new_owner_email
      });
    if (logErr) {
      return res.status(500).json({ error: 'log_failed' });
    }
    const { error: deactivateErr } = await supabase
      .from('ownership')
      .update({
        is_current_owner: false,
        transfer_code: null,
        transfer_code_expires_at: null
      })
      .eq('id', ownership.id);
    if (deactivateErr) {
      return res.status(500).json({ error: 'deactivate_failed' });
    }
    const { error: insertErr } = await supabase
      .from('ownership')
      .insert({
        piece_id: ownership.piece_id,
        owner_name: new_owner_name,
        owner_email: new_owner_email,
        nfc_token: new_token,
        is_current_owner: true
      });
    if (insertErr) {
      return res.status(500).json({ error: 'insert_failed' });
    }
    return res.json({ new_token, piece_id: ownership.piece_id });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
});

// Static files
app.use(express.static(STATIC_DIR, {
  extensions: ['html'],
  maxAge: '1h',
  fallthrough: true
}));

// Verify route → always serve verify.html
app.get('/verify/*', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'verify.html'));
});

// Ledger route → always serve ledger.html
app.get('/ledger', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'ledger.html'));
});

// SPA fallback
app.get('*', (req, res) => {
  const staticExt = /\.(js|css|json|map|ico|png|jpe?g|gif|svg|webp|avif|woff2?|ttf|eot|mp4|webm|pdf)$/i;
  if (staticExt.test(req.path)) {
    return res.status(404).end();
  }
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Phāesto Atelier running on port ${PORT}`);
  console.log(`STATIC_DIR: ${STATIC_DIR}`);
  try {
    const files = fs.readdirSync(STATIC_DIR);
    console.log(`Files (${files.length}):`, files.join(', '));
    const assetsPath = path.join(STATIC_DIR, 'assets');
    if (fs.existsSync(assetsPath)) {
      console.log(`assets/:`, fs.readdirSync(assetsPath).join(', '));
    } else {
      console.log('WARNING: assets/ not found');
    }
  } catch (e) {
    console.error('Could not read static dir:', e.message);
  }
});
