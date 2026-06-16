#!/usr/bin/env node
require('dotenv').config();

const inquirer  = require('inquirer');
const jwt       = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const fs   = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://txepvzhmllhxpqeboodi.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── REFERRAL CODE GENERATOR ────────────────────────────────────────
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PH-';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── EMAIL: FORGE ACKNOWLEDGMENT + REFERRAL ─────────────────────────
function holderAcknowledgmentHTML({ ownerName, pieceName, editionNumber, nfcUrl, referralCode }) {
  const referralUrl = `https://phaestoatelier.com/enter/${referralCode}`;
  const tokenPart   = nfcUrl.replace('phaesto.com/verify/', '');
  const verifyUrl   = `https://phaestoatelier.com/verify/${tokenPart}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>The forge acknowledges you.</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background:#0e0d0c;
    color:#b8b5b0;
    font-family:'Helvetica Neue',Arial,sans-serif;
    font-size:15px;
    line-height:1.7;
    padding:48px 24px;
  }
  .wrap { max-width:520px; margin:0 auto; }
  .mark {
    font-size:11px;
    letter-spacing:0.18em;
    text-transform:uppercase;
    color:#4a4845;
    margin-bottom:40px;
  }
  h1 {
    font-size:18px;
    font-weight:500;
    color:#e2dfd9;
    letter-spacing:0.02em;
    margin-bottom:24px;
    line-height:1.4;
  }
  p { margin-bottom:16px; }
  .divider { border:none; border-top:1px solid #1e1d1b; margin:32px 0; }
  .label {
    font-size:10px;
    letter-spacing:0.2em;
    text-transform:uppercase;
    color:#3a3835;
    margin-bottom:6px;
  }
  .value {
    font-size:13px;
    color:#7a7874;
    font-family:'Courier New',monospace;
    word-break:break-all;
  }
  .referral-block {
    background:#141312;
    border:1px solid #1e1d1b;
    padding:20px 24px;
    margin:32px 0;
  }
  .referral-code {
    font-size:20px;
    font-weight:500;
    letter-spacing:0.12em;
    color:#e2dfd9;
    margin:8px 0 4px;
  }
  .referral-url {
    font-size:12px;
    color:#4a4845;
    font-family:'Courier New',monospace;
    word-break:break-all;
  }
  .footer {
    font-size:11px;
    color:#2e2d2b;
    letter-spacing:0.08em;
    margin-top:48px;
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="mark">Phaesto Atelier</div>
  <h1>The forge acknowledges you.</h1>
  <p>
    ${ownerName ? ownerName + ', your' : 'Your'} piece has been registered.
    <strong style="color:#e2dfd9">${pieceName} &mdash; ${String(editionNumber).padStart(3,'0')}</strong>
    is bound to you. Its record is sealed in the ledger.
  </p>
  <p>
    Scan the chip on your piece at any time.
    That page is your permanent record with the atelier &mdash; do not share the link.
  </p>
  <hr class="divider" />
  <div class="label">Your verify page</div>
  <div class="value">${verifyUrl}</div>
  <hr class="divider" />
  <p style="color:#7a7874;font-size:13px;">
    The atelier extends you one referral. One person.
    Your judgment about who that is reflects directly on you inside the forge.
    This code is single-use. It cannot be reused once claimed.
  </p>
  <div class="referral-block">
    <div class="label">Your referral code</div>
    <div class="referral-code">${referralCode}</div>
    <div class="referral-url">${referralUrl}</div>
  </div>
  <p style="color:#4a4845;font-size:12px;">
    This code also lives permanently on your verify page.
    You do not need this email to access it.
  </p>
  <div class="footer">Phaesto Atelier &mdash; The forge remembers.</div>
</div>
</body>
</html>`;
}

// ─── MAIN ────────────────────────────────────────────────────────────
async function main() {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'piece_id',       message: 'Piece ID (e.g. PH-001):' },
    { type: 'input', name: 'piece_name',     message: 'Piece name:' },
    { type: 'input', name: 'weight_grams',   message: 'Weight in grams:',        validate: v => !isNaN(parseFloat(v))   || 'Must be a number' },
    { type: 'input', name: 'edition_number', message: 'Edition number:',          validate: v => !isNaN(parseInt(v, 10)) || 'Must be a number' },
    { type: 'input', name: 'forge_date',     message: 'Forge date (YYYY-MM-DD):', validate: v => /^\d{4}-\d{2}-\d{2}$/.test(v) || 'Format: YYYY-MM-DD' },
    { type: 'input', name: 'owner_name',     message: 'Owner name:' },
    { type: 'input', name: 'owner_email',    message: 'Owner email:' },
    { type: 'input', name: 'founder_note',   message: 'Founder note (optional):' }
  ]);

  // ── 1. PIECE RECORD ──────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('pieces')
    .select('piece_id')
    .eq('piece_id', answers.piece_id)
    .single();

  if (!existing) {
    const { error: pieceErr } = await supabase
      .from('pieces')
      .insert({
        piece_id:       answers.piece_id,
        piece_name:     answers.piece_name,
        metal:          '925 Sterling Silver',
        weight_grams:   parseFloat(answers.weight_grams),
        edition_number: parseInt(answers.edition_number, 10),
        forge_date:     answers.forge_date,
        founder_note:   answers.founder_note || null
      });
    if (pieceErr) { console.error('Error creating piece:', pieceErr.message); process.exit(1); }
    console.log('✓ Piece record created:', answers.piece_id);
  } else {
    console.log('✓ Piece already exists:', answers.piece_id);
  }

  // ── 2. NFC TOKEN (JWT) ───────────────────────────────────────────
  const token = jwt.sign(
    { piece_id: answers.piece_id, token_id: uuidv4() },
    process.env.JWT_SECRET
  );
  const nfcUrl = 'phaesto.com/verify/' + token;

  // ── 3. OWNERSHIP RECORD ──────────────────────────────────────────
  const { error: ownerErr } = await supabase
    .from('ownership')
    .insert({
      piece_id:            answers.piece_id,
      owner_name:          answers.owner_name,
      owner_email:         answers.owner_email,
      nfc_token:           token,
      is_current_owner:    true,
      pool_access:         false,
      referral_generated:  false,
      forge_cast_received: false
    });
  if (ownerErr) { console.error('Error creating ownership:', ownerErr.message); process.exit(1); }
  console.log('✓ Ownership record created for:', answers.owner_name, '<' + answers.owner_email + '>');

  // ── 4. REFERRAL CODE ─────────────────────────────────────────────
  let referralCode = generateReferralCode();
  const { data: codeCheck } = await supabase
    .from('referrals')
    .select('id')
    .eq('referral_code', referralCode)
    .single();
  if (codeCheck) referralCode = generateReferralCode();

  const { error: refErr } = await supabase
    .from('referrals')
    .insert({
      holder_token:  token,
      referral_code: referralCode,
      used:          false
    });
  if (refErr) { console.error('Error creating referral:', refErr.message); process.exit(1); }

  await supabase
    .from('ownership')
    .update({ referral_generated: true })
    .eq('nfc_token', token);

  console.log('✓ Referral code generated:', referralCode);

  // ── 5. RESEND — FORGE ACKNOWLEDGMENT ────────────────────────────
  if (!answers.owner_email || answers.owner_email.trim() === '') {
    console.log('⚠ No email provided — skipping Resend dispatch');
  } else {
    const { error: emailErr } = await resend.emails.send({
      from:    'The Forge <forge@mail.phaestoatelier.com>',
      to:      [answers.owner_email],
      subject: 'The forge acknowledges you.',
      html:    holderAcknowledgmentHTML({
        ownerName:     answers.owner_name,
        pieceName:     answers.piece_name,
        editionNumber: parseInt(answers.edition_number, 10),
        nfcUrl,
        referralCode
      })
    });
    if (emailErr) {
      console.error('Resend error (records are intact):', emailErr.message);
    } else {
      console.log('✓ Forge acknowledgment dispatched to:', answers.owner_email);
    }
  }

  // ── 6. NFC LOG ───────────────────────────────────────────────────
  console.log('✓ NFC chip URL:', nfcUrl);
  console.log('→ Program this URL into the NTAG216 chip using NFC Tools Pro');

  const logEntry = [
    '',
    '--- ' + new Date().toISOString() + ' ---',
    'Piece: '         + answers.piece_id + ' — ' + answers.piece_name,
    'Edition: '       + answers.edition_number,
    'Owner: '         + answers.owner_name + ' <' + answers.owner_email + '>',
    'NFC URL: '       + nfcUrl,
    'Referral Code: ' + referralCode,
    ''
  ].join('\n');

  fs.appendFileSync(path.join(__dirname, 'orders-log.txt'), logEntry);
  console.log('✓ Logged to orders-log.txt');
}

main().catch(err => { console.error(err); process.exit(1); });
