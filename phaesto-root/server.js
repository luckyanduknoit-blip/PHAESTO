require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://txepvzhmllhxpqeboodi.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

app.use(cors());
app.use(express.json());

// =============================================================
// FORGE NAME GENERATION
// Two-word pseudonym: [Adjective] + [Noun]
// Generated once at pool entry, permanent, not publicly linkable
// to cast number or email.
// =============================================================

const FORGE_ADJECTIVES = [
  'Ashen', 'Hollow', 'Silent', 'Iron', 'Cold', 'Pale', 'Dark', 'Still',
  'Veiled', 'Stark', 'Bare', 'Grave', 'Muted', 'Stern', 'Blunt', 'Dim',
  'Fixed', 'Taut', 'Honed', 'Edged', 'Drawn', 'Bound', 'Sealed', 'Forged',
  'Carved', 'Cast', 'Hammered', 'Tempered', 'Annealed', 'Quenched'
];

const FORGE_NOUNS = [
  'Veil', 'Mark', 'Edge', 'Sigil', 'Form', 'Line', 'Arc', 'Chain',
  'Weight', 'Seal', 'Fold', 'Ridge', 'Knot', 'Core', 'Void', 'Ring',
  'Blade', 'Coil', 'Shard', 'Grain', 'Facet', 'Hilt', 'Mantle', 'Cipher',
  'Current', 'Bearing', 'Tension', 'Fracture', 'Residue', 'Meridian'
];

async function generateForgeName() {
  // Try up to 10 times to get a unique name
  for (let i = 0; i < 10; i++) {
    const adj  = FORGE_ADJECTIVES[Math.floor(Math.random() * FORGE_ADJECTIVES.length)];
    const noun = FORGE_NOUNS[Math.floor(Math.random() * FORGE_NOUNS.length)];
    const name = `${adj} ${noun}`;
    const { data: existing } = await supabase
      .from('ownership')
      .select('id')
      .eq('forge_name', name)
      .single();
    if (!existing) return name;
  }
  // Fallback: append short hex to guarantee uniqueness
  const adj  = FORGE_ADJECTIVES[Math.floor(Math.random() * FORGE_ADJECTIVES.length)];
  const noun = FORGE_NOUNS[Math.floor(Math.random() * FORGE_NOUNS.length)];
  return `${adj} ${noun} ${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

// =============================================================
// HELPER: Validate NFC token → return ownership row
// =============================================================

async function validateToken(token) {
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    const { data: ownership, error } = await supabase
      .from('ownership')
      .select('*')
      .eq('nfc_token', token)
      .eq('is_current_owner', true)
      .single();
    if (error || !ownership) return null;
    return ownership;
  } catch {
    return null;
  }
}

// =============================================================
// EXISTING ROUTES — UNTOUCHED
// =============================================================

app.get('/api/piece/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const { piece_id } = decoded;

    const { data: piece, error: pieceErr } = await supabase
      .from('pieces')
      .select('*')
      .eq('piece_id', piece_id)
      .single();
    if (pieceErr || !piece) return res.status(404).json({ error: 'piece_not_found' });

    const { data: owner, error: ownerErr } = await supabase
      .from('ownership')
      .select('owner_name, claimed_at, pool_access, forge_name, pool_login_code, referral_generated, nfc_token')
      .eq('piece_id', piece_id)
      .eq('is_current_owner', true)
      .single();
    if (ownerErr || !owner) return res.status(404).json({ error: 'owner_not_found' });

    const { data: transferLog } = await supabase
      .from('transfer_log')
      .select('*')
      .eq('piece_id', piece_id)
      .order('transferred_at', { ascending: false });

    // Fetch referral code for verify page display
    const { data: referral } = await supabase
      .from('referrals')
      .select('referral_code, used')
      .eq('holder_token', owner.nfc_token)
      .single();

    return res.json({
      piece,
      owner:       { name: owner.owner_name, claimed_at: owner.claimed_at },
      transferLog: transferLog || [],
      poolAccess:  owner.pool_access,
      forgeName:   owner.forge_name,
      poolLoginCode: owner.pool_login_code,
      referral:    referral || null
    });
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
});

app.post('/api/forge', async (req, res) => {
  try {
    const { devotion, contact } = req.body;
    if (!devotion || !contact) return res.status(400).json({ error: 'missing_fields' });
    const { error } = await supabase.from('applications').insert({ intent: devotion, contact });
    if (error) return res.status(500).json({ error: 'save_failed' });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/transfer/initiate', async (req, res) => {
  try {
    const { token, seller_email } = req.body;
    if (!token || !seller_email) return res.status(400).json({ error: 'missing_fields' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { piece_id } = decoded;

    const { data: ownership, error: ownerErr } = await supabase
      .from('ownership').select('*').eq('piece_id', piece_id).eq('is_current_owner', true).single();
    if (ownerErr || !ownership) return res.status(404).json({ error: 'ownership_not_found' });
    if (ownership.owner_email !== seller_email) return res.status(403).json({ error: 'email_mismatch' });

    const transfer_code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const transfer_code_expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { error: updateErr } = await supabase
      .from('ownership').update({ transfer_code, transfer_code_expires_at }).eq('id', ownership.id);
    if (updateErr) return res.status(500).json({ error: 'update_failed' });

    return res.json({ transfer_code });
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
});

app.post('/api/transfer/claim', async (req, res) => {
  try {
    const { transfer_code, new_owner_name, new_owner_email } = req.body;
    if (!transfer_code || !new_owner_name || !new_owner_email)
      return res.status(400).json({ error: 'missing_fields' });

    const { data: ownership, error: findErr } = await supabase
      .from('ownership').select('*')
      .eq('transfer_code', transfer_code).eq('is_current_owner', true)
      .gt('transfer_code_expires_at', new Date().toISOString()).single();
    if (findErr || !ownership) return res.status(400).json({ error: 'invalid_or_expired_code' });

    const new_token = jwt.sign(
      { piece_id: ownership.piece_id, token_id: uuidv4() },
      process.env.JWT_SECRET
    );

    const { error: logErr } = await supabase.from('transfer_log').insert({
      piece_id:         ownership.piece_id,
      from_owner_email: ownership.owner_email,
      to_owner_email:   new_owner_email
    });
    if (logErr) return res.status(500).json({ error: 'log_failed' });

    await supabase.from('ownership').update({
      is_current_owner: false, transfer_code: null, transfer_code_expires_at: null
    }).eq('id', ownership.id);

    const { error: insertErr } = await supabase.from('ownership').insert({
      piece_id:        ownership.piece_id,
      owner_name:      new_owner_name,
      owner_email:     new_owner_email,
      nfc_token:       new_token,
      is_current_owner: true
    });
    if (insertErr) return res.status(500).json({ error: 'insert_failed' });

    return res.json({ new_token, piece_id: ownership.piece_id });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
});

// =============================================================
// POOL ROUTES
// =============================================================

// POST /pool/auth
// Exchange pool_login_code for session. If pool_access is true
// but forge_name is not yet set, generate it now.
app.post('/pool/auth', async (req, res) => {
  try {
    const { login_code } = req.body;
    if (!login_code) return res.status(400).json({ error: 'missing_code' });

    const { data: ownership, error } = await supabase
      .from('ownership')
      .select('*')
      .eq('pool_login_code', login_code.trim().toUpperCase())
      .eq('is_current_owner', true)
      .single();

    if (error || !ownership) return res.status(401).json({ error: 'invalid_code' });
    if (!ownership.pool_access) return res.status(403).json({ error: 'access_not_granted' });

    // Generate forge name on first pool entry if not yet assigned
    let forgeName = ownership.forge_name;
    if (!forgeName) {
      forgeName = await generateForgeName();
      const { error: nameErr } = await supabase
        .from('ownership')
        .update({ forge_name: forgeName })
        .eq('id', ownership.id);
      if (nameErr) return res.status(500).json({ error: 'forge_name_failed' });
    }

    return res.json({
      session_token: ownership.nfc_token,
      forge_name:    forgeName
    });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
});

// POST /pool/activate
// Called when admin grants pool access to a holder.
// Flips pool_access = true. Forge name is assigned lazily on first /pool/auth.
// Requires admin secret header.
app.post('/pool/activate', async (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET)
      return res.status(403).json({ error: 'forbidden' });

    const { nfc_token } = req.body;
    if (!nfc_token) return res.status(400).json({ error: 'missing_token' });

    const { data: ownership, error: findErr } = await supabase
      .from('ownership')
      .select('id, pool_access, forge_name')
      .eq('nfc_token', nfc_token)
      .eq('is_current_owner', true)
      .single();
    if (findErr || !ownership) return res.status(404).json({ error: 'holder_not_found' });
    if (ownership.pool_access) return res.json({ success: true, already_active: true });

    const { error: updateErr } = await supabase
      .from('ownership')
      .update({ pool_access: true })
      .eq('id', ownership.id);
    if (updateErr) return res.status(500).json({ error: 'activate_failed' });

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
});

// POST /pool/post
// Accepts post_type from body: provocation | question | struggle | vote
// Defaults to 'provocation' if not provided or invalid.
const VALID_POST_TYPES = ['provocation', 'question', 'struggle', 'vote'];

app.post('/pool/post', async (req, res) => {
  try {
    const { token, content, post_type } = req.body;
    if (!token || !content) return res.status(400).json({ error: 'missing_fields' });

    const ownership = await validateToken(token);
    if (!ownership) return res.status(401).json({ error: 'invalid_token' });
    if (!ownership.pool_access) return res.status(403).json({ error: 'pool_access_denied' });
    if (!ownership.forge_name) return res.status(403).json({ error: 'forge_name_not_set' });

    const trimmed = content.trim();
    if (trimmed.length < 1 || trimmed.length > 1200)
      return res.status(400).json({ error: 'content_length_invalid' });

    const resolvedType = VALID_POST_TYPES.includes(post_type) ? post_type : 'provocation';

    const { error: insertErr } = await supabase.from('pool_posts').insert({
      forge_name: ownership.forge_name,
      content:    trimmed,
      post_type:  resolvedType
    });
    if (insertErr) return res.status(500).json({ error: 'post_failed' });

    await supabase.from('ownership')
      .update({ pool_last_active: new Date().toISOString() }).eq('id', ownership.id);

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
});

// GET /pool/feed
// Returns visible posts, newest first. Includes whether current
// holder has already upvoted each post.
app.get('/pool/feed', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'missing_token' });

    const ownership = await validateToken(token);
    if (!ownership) return res.status(401).json({ error: 'invalid_token' });
    if (!ownership.pool_access) return res.status(403).json({ error: 'pool_access_denied' });

    const { data: posts, error: fetchErr } = await supabase
      .from('pool_posts')
      .select('id, forge_name, content, post_type, upvotes, created_at')
      .eq('visible', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if (fetchErr) return res.status(500).json({ error: 'feed_fetch_failed' });

    // Fetch this holder's upvotes to mark which posts they've already voted on
    const postIds = (posts || []).map(p => p.id);
    let upvotedIds = new Set();
    if (postIds.length > 0) {
      const { data: myVotes } = await supabase
        .from('pool_upvotes')
        .select('post_id')
        .eq('holder_token', token)
        .in('post_id', postIds);
      if (myVotes) myVotes.forEach(v => upvotedIds.add(v.post_id));
    }

    const enriched = (posts || []).map(p => ({
      ...p,
      upvoted_by_me: upvotedIds.has(p.id)
    }));

    await supabase.from('ownership')
      .update({ pool_last_active: new Date().toISOString() }).eq('id', ownership.id);

    return res.json({ posts: enriched, forge_name: ownership.forge_name });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
});

// POST /pool/upvote
// Deduplication via pool_upvotes unique constraint (holder_token + post_id).
// Increments upvotes counter on pool_posts.
app.post('/pool/upvote', async (req, res) => {
  try {
    const { token, post_id } = req.body;
    if (!token || !post_id) return res.status(400).json({ error: 'missing_fields' });

    const ownership = await validateToken(token);
    if (!ownership) return res.status(401).json({ error: 'invalid_token' });
    if (!ownership.pool_access) return res.status(403).json({ error: 'pool_access_denied' });

    // Check duplicate via holder_token (more secure than forge_name)
    const { data: existing } = await supabase
      .from('pool_upvotes')
      .select('id')
      .eq('holder_token', token)
      .eq('post_id', post_id)
      .single();
    if (existing) return res.status(409).json({ error: 'already_upvoted' });

    const { error: upvoteErr } = await supabase
      .from('pool_upvotes')
      .insert({ holder_token: token, post_id });
    if (upvoteErr) return res.status(500).json({ error: 'upvote_failed' });

    // Increment counter — try RPC first, fall back to read-modify-write
    const { error: incrErr } = await supabase.rpc('increment_upvotes', { post_id });
    if (incrErr) {
      const { data: post } = await supabase
        .from('pool_posts').select('upvotes').eq('id', post_id).single();
      if (post) await supabase
        .from('pool_posts').update({ upvotes: post.upvotes + 1 }).eq('id', post_id);
    }

    await supabase.from('ownership')
      .update({ pool_last_active: new Date().toISOString() }).eq('id', ownership.id);

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
});

// =============================================================
// STATIC + SPA FALLBACK — UNTOUCHED
// =============================================================

app.use(express.static(path.join(__dirname), { extensions: ['html'] }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Phaēsto Atelier running on port ${PORT}`);
});
