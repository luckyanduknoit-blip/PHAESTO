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

// Always resolve relative to THIS file, no matter where node is invoked from
const STATIC_DIR = path.resolve(__dirname);

// Supabase client (service role for full access)
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://txepvzhmllhxpqeboodi.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

app.use(cors());
app.use(express.json());

// --- API Routes ---

// GET /api/piece/:token — Verify NFC token and return certificate data
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
      return res.status(404).json({ error: 'piece_not_found' });
    }

    const { data: owner, error: ownerErr } = await supabase
      .from('ownership')
      .select('owner_name, claimed_at')
      .eq('piece_id', piece_id)
      .eq('is_current_owner', true)
      .single();

    if (ownerErr || !owner) {
      return res.status(404).json({ error: 'owner_not_found' });
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
    return res.status(401).json({ error: 'invalid_token' });
  }
});

// POST /api/transfer/initiate — Start ownership transfer
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

// POST /api/transfer/claim — Claim ownership with transfer code
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

// --- Static file serving ---
app.use(express.static(STATIC_DIR, {
  extensions: ['html'],
  maxAge: '1h',
  fallthrough: true
}));

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
  console.log(`__dirname: ${__dirname}`);
  console.log(`STATIC_DIR: ${STATIC_DIR}`);
  try {
    const files = fs.readdirSync(STATIC_DIR);
    console.log(`Files in static root (${files.length}):`, files.join(', '));
    // Also list assets subfolder if present
    const assetsPath = path.join(STATIC_DIR, 'assets');
    if (fs.existsSync(assetsPath)) {
      const assets = fs.readdirSync(assetsPath);
      console.log(`Files in assets/ (${assets.length}):`, assets.join(', '));
    } else {
      console.log('WARNING: assets/ folder NOT found at', assetsPath);
    }
  } catch (e) {
    console.error('Could not read static dir:', e.message);
  }
});
