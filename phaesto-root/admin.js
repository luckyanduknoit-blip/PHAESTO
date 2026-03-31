#!/usr/bin/env node
require('dotenv').config();

const inquirer = require('inquirer');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://txepvzhmllhxpqeboodi.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'piece_id', message: 'Piece ID (e.g. PH-001):' },
    { type: 'input', name: 'piece_name', message: 'Piece name:' },
    { type: 'input', name: 'weight_grams', message: 'Weight in grams:', validate: function (v) { return !isNaN(parseFloat(v)) || 'Must be a number'; } },
    { type: 'input', name: 'edition_number', message: 'Edition number:', validate: function (v) { return !isNaN(parseInt(v, 10)) || 'Must be a number'; } },
    { type: 'input', name: 'forge_date', message: 'Forge date (YYYY-MM-DD):', validate: function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(v) || 'Format: YYYY-MM-DD'; } },
    { type: 'input', name: 'owner_name', message: 'Owner name:' },
    { type: 'input', name: 'owner_email', message: 'Owner email:' },
    { type: 'input', name: 'founder_note', message: 'Founder note (optional):' }
  ]);

  // Check if piece already exists
  const { data: existing } = await supabase
    .from('pieces')
    .select('piece_id')
    .eq('piece_id', answers.piece_id)
    .single();

  if (!existing) {
    const { error: pieceErr } = await supabase
      .from('pieces')
      .insert({
        piece_id: answers.piece_id,
        piece_name: answers.piece_name,
        metal: '925 Sterling Silver',
        weight_grams: parseFloat(answers.weight_grams),
        edition_number: parseInt(answers.edition_number, 10),
        forge_date: answers.forge_date,
        founder_note: answers.founder_note || null
      });

    if (pieceErr) {
      console.error('Error creating piece:', pieceErr.message);
      process.exit(1);
    }
    console.log('\u2713 Piece record created: ' + answers.piece_id);
  } else {
    console.log('\u2713 Piece already exists: ' + answers.piece_id);
  }

  // Generate JWT (no expiry)
  const token = jwt.sign(
    { piece_id: answers.piece_id, token_id: uuidv4() },
    process.env.JWT_SECRET
  );

  // Create ownership record
  const { error: ownerErr } = await supabase
    .from('ownership')
    .insert({
      piece_id: answers.piece_id,
      owner_name: answers.owner_name,
      owner_email: answers.owner_email,
      nfc_token: token,
      is_current_owner: true
    });

  if (ownerErr) {
    console.error('Error creating ownership:', ownerErr.message);
    process.exit(1);
  }

  var nfcUrl = 'phaesto.com/verify/' + token;

  console.log('\u2713 Ownership record created for: ' + answers.owner_name + ' <' + answers.owner_email + '>');
  console.log('\u2713 NFC chip URL: ' + nfcUrl);
  console.log('\u2192 Program this URL into the NTAG216 chip using NFC Tools Pro');

  // Append to orders-log.txt
  var logEntry = [
    '',
    '--- ' + new Date().toISOString() + ' ---',
    'Piece: ' + answers.piece_id + ' — ' + answers.piece_name,
    'Edition: ' + answers.edition_number,
    'Owner: ' + answers.owner_name + ' <' + answers.owner_email + '>',
    'NFC URL: ' + nfcUrl,
    ''
  ].join('\n');

  fs.appendFileSync(path.join(__dirname, 'orders-log.txt'), logEntry);
  console.log('\u2713 Logged to orders-log.txt');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
