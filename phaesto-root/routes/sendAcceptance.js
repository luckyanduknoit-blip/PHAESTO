// routes/sendAcceptance.js
// Mounted in server.js as: app.use('/admin', require('./routes/sendAcceptance'));

const express  = require('express');
const { Resend } = require('resend');
const fs       = require('fs');
const path     = require('path');
const router   = express.Router();

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple header-based admin guard
function adminGuard(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Load template once at startup
const TEMPLATE_PATH = path.join(__dirname, '../email-templates/acceptance.html');
let emailTemplate = '';
try {
  emailTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8');
} catch (e) {
  console.error('[Phaesto] Could not load email template:', e.message);
}

// POST /admin/send-acceptance
router.post('/send-acceptance', adminGuard, async (req, res) => {
  const { buyerName, buyerEmail, pieceName, stripePaymentUrl } = req.body;

  if (!buyerName || !buyerEmail || !pieceName || !stripePaymentUrl) {
    return res.status(400).json({
      error: 'Missing required fields: buyerName, buyerEmail, pieceName, stripePaymentUrl'
    });
  }

  const html = emailTemplate
    .replace(/\{\{BUYER_NAME\}\}/g,         buyerName)
    .replace(/\{\{PIECE_NAME\}\}/g,         pieceName)
    .replace(/\{\{STRIPE_PAYMENT_URL\}\}/g, stripePaymentUrl);

  try {
    const { data, error } = await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL,
      to:      buyerEmail,
      subject: `Your acquisition of ${pieceName} — Phaesto Atelier`,
      html,
    });

    if (error) {
      console.error('[Phaesto] Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email.', details: error });
    }

    console.log(`[Phaesto] Acceptance email sent → ${buyerEmail} | piece: ${pieceName} | id: ${data.id}`);
    return res.status(200).json({ success: true, resendId: data.id });

  } catch (err) {
    console.error('[Phaesto] Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
});

module.exports = router;
