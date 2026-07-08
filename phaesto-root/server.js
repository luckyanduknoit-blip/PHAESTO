require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://txepvzhmllhxpqeboodi.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

app.use(cors());
app.use(express.json());

// =============================================================
// FORGE NAME GENERATION
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
  const adj  = FORGE_ADJECTIVES[Math.floor(Math.random() * FORGE_ADJECTIVES.length)];
  const noun = FORGE_NOUNS[Math.floor(Math.random() * FORGE_NOUNS.length)];
  return `${adj} ${noun} ${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

// =============================================================
// FORGE QUESTION
// =============================================================

const FORGE_QUESTION = 'What will you devote yourself to until it is made real?';

// =============================================================
// HELPER: Validate NFC token
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
// API ROUTES
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

app.post('/pool/upvote', async (req, res) => {
  try {
    const { token, post_id } = req.body;
    if (!token || !post_id) return res.status(400).json({ error: 'missing_fields' });

    const ownership = await validateToken(token);
    if (!ownership) return res.status(401).json({ error: 'invalid_token' });
    if (!ownership.pool_access) return res.status(403).json({ error: 'pool_access_denied' });

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
// REFERRAL ENTRY ROUTES
// =============================================================

app.get('/enter/:referral_code', async (req, res) => {
  const { referral_code } = req.params;

  const { data: referral, error } = await supabase
    .from('referrals')
    .select('id, used')
    .eq('referral_code', referral_code)
    .single();

  if (error || !referral) return res.status(404).json({ error: 'This path does not exist.' });
  if (referral.used === true) return res.status(410).json({ error: 'This entry has already been claimed.' });

  return res.status(200).json({ question: FORGE_QUESTION });
});

app.post('/enter/:referral_code', async (req, res) => {
  const { referral_code } = req.params;
  const { email, response_text } = req.body;

  if (!email || !response_text)
    return res.status(400).json({ error: 'Incomplete submission.' });

  const { data: updateResult, error: updateError } = await supabase
    .from('referrals')
    .update({ used: true, used_by: email })
    .eq('referral_code', referral_code)
    .eq('used', false)
    .select('id');

  if (updateError || !updateResult || updateResult.length === 0)
    return res.status(410).json({ error: 'This entry has already been claimed.' });

  const { error: entryError } = await supabase
    .from('forge_entries')
    .insert({ referral_code, email, response_text, approved: false });

  if (entryError) {
    console.error('forge_entries insert failed:', entryError);
    return res.status(500).json({ error: 'Entry could not be recorded.' });
  }

  await resend.emails.send({
    from: 'forge@phaestoatelier.com',
    to: email,
    subject: 'The Forge Has Received Your Entry',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#0e0e0e;color:#c8c8c8;">
        <p style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#555;margin-bottom:32px;">Phaesto Atelier</p>
        <p style="font-size:15px;line-height:1.7;">The forge has received your entry.</p>
        <p style="font-size:15px;line-height:1.7;margin-top:16px;">You will be notified if access is extended.</p>
        <p style="font-size:12px;color:#333;margin-top:48px;border-top:1px solid #1a1a1a;padding-top:24px;">Do not reply to this message.</p>
      </div>
    `
  });

  await resend.emails.send({
    from: 'forge@phaestoatelier.com',
    to: 'lucky@phaestoatelier.com',
    subject: 'Forge Entry — Review Required',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0e0e0e;color:#c8c8c8;">
        <p style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#555;margin-bottom:24px;">Forge Entry — Internal</p>
        <p><strong style="color:#fff;">Email:</strong> ${email}</p>
        <p style="margin-top:16px;"><strong style="color:#fff;">Question:</strong> ${FORGE_QUESTION}</p>
        <p style="margin-top:8px;padding:16px;background:#161616;border:1px solid #222;border-radius:6px;line-height:1.7;">
          ${response_text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </p>
      </div>
    `
  });

  return res.status(200).json({ success: true });
});

// =============================================================
// CRON: Daily referral generation
// =============================================================

app.get('/cron/referrals', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET)
    return res.status(403).json({ error: 'Forbidden' });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: entries, error } = await supabase
    .from('forge_entries')
    .select('email, approved_at')
    .eq('approved', true)
    .lte('approved_at', thirtyDaysAgo);

  if (error || !entries || entries.length === 0)
    return res.status(200).json({ processed: 0 });

  let processed = 0;

  for (const entry of entries) {
    const { data: owner } = await supabase
      .from('ownership')
      .select('nfc_token, referral_generated')
      .eq('email', entry.email)
      .eq('is_current_owner', true)
      .single();

    if (!owner || owner.referral_generated === true) continue;

    const referralCode = 'PH-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    await supabase.from('referrals').insert({
      holder_token: owner.nfc_token,
      referral_code: referralCode,
      used: false
    });

    await supabase
      .from('ownership')
      .update({ referral_generated: true })
      .eq('nfc_token', owner.nfc_token);

    await resend.emails.send({
      from: 'forge@phaestoatelier.com',
      to: entry.email,
      subject: 'The Forge Has Extended Your Reach',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#0e0e0e;color:#c8c8c8;">
          <p style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#555;margin-bottom:32px;">Phaesto Atelier</p>
          <p style="font-size:15px;line-height:1.7;">The forge has determined you are ready to extend its reach.</p>
          <p style="font-size:15px;line-height:1.7;margin-top:16px;">Your referral code is available when you access your cast record.</p>
          <p style="font-size:12px;color:#333;margin-top:48px;border-top:1px solid #1a1a1a;padding-top:24px;">One code. One entry. It cannot be reused.</p>
        </div>
      `
    });

    processed++;
  }

  return res.status(200).json({ processed });
});

// =============================================================
// ADMIN: Forge Cast
// =============================================================

app.post('/admin/forge-cast', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET)
    return res.status(403).json({ error: 'Forbidden' });

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const { data: eligible, error } = await supabase
    .from('ownership')
    .select('id, nfc_token, email, holder_name, forge_name')
    .eq('is_current_owner', true)
    .eq('forge_cast_received', false)
    .gte('pool_last_active', sixtyDaysAgo);

  if (error) return res.status(500).json({ error: 'Query failed.' });

  if (!eligible || eligible.length === 0) {
    const { data: allHolders } = await supabase
      .from('ownership')
      .select('forge_cast_received')
      .eq('is_current_owner', true);

    const allReceived = allHolders && allHolders.length > 0 &&
      allHolders.every(h => h.forge_cast_received === true);

    if (allReceived) {
      await supabase
        .from('ownership')
        .update({ forge_cast_received: false })
        .eq('is_current_owner', true);

      return res.status(200).json({
        message: 'Full cycle complete. All holders reset. Run again to begin the next cycle.'
      });
    }

    return res.status(200).json({
      message: 'No eligible holders.'
    });
  }

  const winner = eligible[Math.floor(Math.random() * eligible.length)];

  await supabase
    .from('ownership')
    .update({ forge_cast_received: true })
    .eq('nfc_token', winner.nfc_token);

  await supabase.from('forge_events').insert({
    event_type: 'forge_cast',
    recipient_token: winner.nfc_token,
    notes: `Dispatched to ${winner.email}`
  });

  await resend.emails.send({
    from: 'forge@phaestoatelier.com',
    to: winner.email,
    subject: 'The Forge Has Chosen',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#0e0e0e;color:#c8c8c8;">
        <p style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#555;margin-bottom:32px;">Phaesto Atelier</p>
        <p style="font-size:15px;line-height:1.7;">The forge has chosen you.</p>
        <p style="font-size:15px;line-height:1.7;margin-top:16px;">
          What arrives belongs to no cycle, no system, no expectation.<br>
          It is a recognition.
        </p>
        <p style="font-size:15px;line-height:1.7;margin-top:16px;">Watch for it.</p>
        <p style="font-size:12px;color:#333;margin-top:48px;border-top:1px solid #1a1a1a;padding-top:24px;">No reply is needed. No announcement will be made.</p>
      </div>
    `
  });

  return res.status(200).json({
    success: true,
    selected: {
      email:       winner.email,
      holder_name: winner.holder_name,
      forge_name:  winner.forge_name || 'unassigned'
    },
    eligible_pool_size: eligible.length
  });
});

// =============================================================
// STATIC FILES
// =============================================================

app.use(express.static(path.join(__dirname), { extensions: ['html'] }));

// NFC verify page — must serve verify.html, not index.html
app.get('/verify/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'verify.html'));
});

// Transfer claim page — also needs verify.html (nfc.js handles /transfer/claim/* path)
app.get('/transfer/claim/:code', (req, res) => {
  res.sendFile(path.join(__dirname, 'verify.html'));
});

// SPA fallback for everything else
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Phaēsto Atelier running on port ${PORT}`);
});
