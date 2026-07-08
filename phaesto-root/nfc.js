(function () {
  'use strict';

  var SITE = 'https://phaestoatelier.com';
  var pathname = window.location.pathname;

  // --- Utility ---
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'textContent') { node.textContent = attrs[k]; }
        else if (k === 'innerHTML') { node.innerHTML = attrs[k]; }
        else if (k === 'style' && typeof attrs[k] === 'object') {
          Object.keys(attrs[k]).forEach(function (s) { node.style[s] = attrs[k][s]; });
        } else { node.setAttribute(k, attrs[k]); }
      });
    }
    if (children) {
      children.forEach(function (c) {
        if (typeof c === 'string') { node.appendChild(document.createTextNode(c)); }
        else if (c) { node.appendChild(c); }
      });
    }
    return node;
  }

  function formatDate(iso) {
    var d = new Date(iso);
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function formatForgeDate(iso) {
    var d = new Date(iso);
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function padEdition(n) {
    var s = String(n);
    while (s.length < 3) s = '0' + s;
    return s;
  }

  function injectStyles() {
    if (document.getElementById('phaesto-nfc-styles')) return;
    var css = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Cormorant+SC:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

@keyframes ph-fade { from { opacity:0; } to { opacity:1; } }
@keyframes ph-rise { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
@keyframes ph-pulse { 0%,100% { opacity:0.4; } 50% { opacity:0.9; } }
@keyframes ph-scan {
  0%   { transform:scaleX(0); transform-origin:left; }
  50%  { transform:scaleX(1); transform-origin:left; }
  50.001% { transform-origin:right; }
  100% { transform:scaleX(0); transform-origin:right; }
}
@keyframes ph-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}

/* ── LOADING OVERLAY ──────────────────────────────── */
#phaesto-overlay {
  position: fixed; inset: 0;
  background: #080808;
  z-index: 99999;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  font-family: 'Cormorant Garamond', Georgia, serif;
  color: rgba(255,255,255,0.85);
}
#phaesto-overlay .sigil-pulse {
  width: 52px; height: 52px; opacity: 0.5;
  animation: ph-pulse 2.4s ease-in-out infinite;
  filter: brightness(0) invert(1);
}
#phaesto-overlay .overlay-text {
  margin-top: 28px;
  font-family: 'Cormorant SC', serif;
  font-size: 10px; letter-spacing: .28em;
  text-transform: uppercase; color: rgba(255,255,255,0.28);
}
#phaesto-overlay .overlay-scan {
  width: 48px; height: 1px;
  background: rgba(255,255,255,0.5);
  margin-top: 20px;
  animation: ph-scan 1.8s ease-in-out infinite;
}
#phaesto-overlay .overlay-error {
  font-size: 15px; color: rgba(255,255,255,0.45);
  text-align: center; max-width: 320px;
  line-height: 1.7; letter-spacing: .02em;
  animation: ph-fade 400ms ease;
}

/* ── MAIN CERTIFICATE ────────────────────────────── */
#phaesto-certificate {
  min-height: 100vh;
  background: #080808;
  font-family: 'Cormorant Garamond', Georgia, serif;
  color: rgba(255,255,255,0.82);
  animation: ph-rise 900ms cubic-bezier(0.16,1,0.3,1) both;
}

/* Hero band */
.cert-hero {
  position: relative;
  padding: 72px 24px 56px;
  text-align: center;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
}
.cert-hero::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(200,168,78,0.06) 0%, transparent 70%);
  pointer-events: none;
}
.cert-wordmark {
  font-family: 'Cormorant SC', serif;
  font-size: 11px; font-weight: 400;
  letter-spacing: .36em;
  color: rgba(255,255,255,0.22);
  text-transform: uppercase;
  margin-bottom: 40px;
  display: flex; align-items: center; justify-content: center; gap: 14px;
}
.cert-wordmark::before, .cert-wordmark::after {
  content: ''; display: block;
  width: 24px; height: 1px;
  background: rgba(255,255,255,0.12);
}
.cert-sigil-wrap {
  width: 56px; height: 56px;
  margin: 0 auto 32px;
  position: relative;
}
.cert-sigil-wrap::before {
  content: '';
  position: absolute; inset: -10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(200,168,78,0.08) 0%, transparent 70%);
}
.cert-sigil {
  width: 100%; height: 100%;
  object-fit: contain;
  opacity: 0.55;
  filter: brightness(0) invert(1);
  position: relative; z-index: 1;
}
.cert-piece-name {
  font-family: 'Cormorant SC', serif;
  font-size: clamp(22px, 5vw, 34px);
  font-weight: 300;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.90);
  margin: 0 0 10px;
  line-height: 1.15;
}
.cert-edition-badge {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 5px 14px;
  border: 1px solid rgba(255,255,255,0.08);
  font-family: 'Cormorant SC', serif;
  font-size: 10px; letter-spacing: .22em;
  color: rgba(255,255,255,0.28);
  margin-top: 4px;
}
.cert-edition-badge .badge-num {
  font-size: 13px; color: rgba(200,168,78,0.6);
  letter-spacing: .06em;
}

/* Data grid */
.cert-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: rgba(255,255,255,0.05);
  margin: 0;
}
@media (max-width: 480px) {
  .cert-grid { grid-template-columns: 1fr; }
}
.cert-cell {
  background: #080808;
  padding: 28px 32px;
  position: relative;
}
.cert-cell::after {
  content: '';
  position: absolute; bottom: 0; left: 32px; right: 32px;
  height: 1px;
  background: rgba(255,255,255,0.03);
}
.cert-cell-label {
  font-family: 'Cormorant SC', serif;
  font-size: 9px; letter-spacing: .28em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.22);
  margin-bottom: 8px;
  display: flex; align-items: center; gap: 8px;
}
.cert-cell-label::after {
  content: ''; flex: 1; height: 1px;
  background: rgba(255,255,255,0.05);
}
.cert-cell-value {
  font-size: 16px; font-weight: 300;
  color: rgba(255,255,255,0.82);
  letter-spacing: .02em;
  line-height: 1.4;
}
.cert-cell-value.accent { color: rgba(200,168,78,0.75); }

/* Owner strip */
.cert-owner-strip {
  padding: 36px 32px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex; align-items: center; gap: 20px;
}
.cert-owner-icon {
  width: 36px; height: 36px; flex-shrink: 0;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.25);
  font-size: 14px;
}
.cert-owner-name {
  font-family: 'Cormorant SC', serif;
  font-size: 15px; letter-spacing: .08em;
  color: rgba(255,255,255,0.82);
}
.cert-owner-since {
  font-size: 12px;
  color: rgba(255,255,255,0.28);
  margin-top: 3px; letter-spacing: .04em;
}

/* Founder note */
.cert-note-wrap {
  padding: 40px 32px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  position: relative;
}
.cert-note-wrap::before {
  content: '\u201C';
  position: absolute; top: 28px; left: 28px;
  font-family: Georgia, serif; font-size: 48px;
  color: rgba(255,255,255,0.05); line-height: 1;
  pointer-events: none;
}
.cert-founder-note {
  font-style: italic; font-size: 16px;
  color: rgba(255,255,255,0.45);
  line-height: 1.85; letter-spacing: .01em;
  max-width: 540px;
  padding-left: 16px;
  border-left: 1px solid rgba(255,255,255,0.07);
}

/* Provenance / transfer log */
.cert-provenance {
  padding: 36px 32px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.cert-section-label {
  font-family: 'Cormorant SC', serif;
  font-size: 9px; letter-spacing: .3em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.18);
  margin-bottom: 20px;
  display: flex; align-items: center; gap: 10px;
}
.cert-section-label::after {
  content: ''; flex: 1; height: 1px;
  background: rgba(255,255,255,0.05);
}
.cert-tx-row {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.cert-tx-row:last-child { border-bottom: none; }
.cert-tx-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(255,255,255,0.12);
  margin-top: 6px; flex-shrink: 0;
}
.cert-tx-dot.first { background: rgba(200,168,78,0.4); }
.cert-tx-meta { flex: 1; }
.cert-tx-parties {
  font-size: 13px; color: rgba(255,255,255,0.5);
  letter-spacing: .01em; line-height: 1.5;
}
.cert-tx-date {
  font-size: 11px; color: rgba(255,255,255,0.2);
  margin-top: 2px; letter-spacing: .04em;
  font-family: 'Cormorant SC', serif;
}

/* Transfer portal */
.cert-transfer-portal {
  padding: 40px 32px 56px;
}
.cert-transfer-trigger {
  display: flex; align-items: center; gap: 12px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.35);
  font-family: 'Cormorant SC', serif;
  font-size: 10px; letter-spacing: .24em;
  text-transform: uppercase;
  padding: 14px 22px;
  cursor: pointer;
  transition: border-color .3s, color .3s;
  width: 100%;
  justify-content: center;
}
.cert-transfer-trigger:hover {
  border-color: rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.65);
}
.cert-transfer-trigger svg { opacity: 0.4; }
.cert-transfer-trigger:hover svg { opacity: 0.8; }

/* Transfer form (expanded) */
.cert-transfer-form {
  margin-top: 24px;
  animation: ph-rise 300ms ease both;
  border: 1px solid rgba(255,255,255,0.06);
  padding: 28px;
}
.cert-form-label {
  font-family: 'Cormorant SC', serif;
  font-size: 9px; letter-spacing: .24em;
  color: rgba(255,255,255,0.22);
  margin-bottom: 8px; display: block;
  text-transform: uppercase;
}
.cert-input {
  display: block; width: 100%;
  padding: 12px 14px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.07);
  border-bottom-color: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.82);
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 15px; letter-spacing: .02em;
  outline: none;
  transition: border-color .25s;
  margin-bottom: 18px;
}
.cert-input:focus {
  border-color: rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.03);
}
.cert-input::placeholder { color: rgba(255,255,255,0.18); }
.cert-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 13px 28px;
  border: 1px solid rgba(255,255,255,0.10);
  background: transparent;
  color: rgba(255,255,255,0.55);
  font-family: 'Cormorant SC', serif;
  font-size: 10px; letter-spacing: .2em; text-transform: uppercase;
  cursor: pointer;
  transition: border-color .3s, color .3s, background .3s;
}
.cert-btn:hover {
  border-color: rgba(255,255,255,0.25);
  color: rgba(255,255,255,0.85);
  background: rgba(255,255,255,0.03);
}
.cert-btn:disabled { opacity: .4; cursor: default; }

/* Code reveal box */
.cert-code-box {
  margin-top: 20px;
  padding: 28px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.015);
  animation: ph-rise 300ms ease both;
  text-align: center;
}
.cert-code {
  font-family: 'Courier New', monospace;
  font-size: 28px; letter-spacing: .28em;
  color: rgba(255,255,255,0.88);
  margin-bottom: 14px;
  background: linear-gradient(90deg, rgba(255,255,255,0.88) 0%, rgba(200,168,78,0.8) 50%, rgba(255,255,255,0.88) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ph-shimmer 3s linear infinite;
}
.cert-code-info {
  font-size: 13px; color: rgba(255,255,255,0.28);
  line-height: 1.8; letter-spacing: .01em;
  margin-bottom: 16px;
}
.cert-code-url {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: rgba(255,255,255,0.2);
  letter-spacing: .04em;
  word-break: break-all;
  margin-bottom: 18px;
  padding: 10px 14px;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.02);
}
.cert-copy-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px;
  border: 1px solid rgba(255,255,255,0.08);
  background: transparent;
  color: rgba(255,255,255,0.35);
  font-family: 'Cormorant SC', serif;
  font-size: 9px; letter-spacing: .2em; text-transform: uppercase;
  cursor: pointer; transition: all .25s;
}
.cert-copy-btn:hover {
  border-color: rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.7);
}
.cert-msg-error {
  font-size: 13px;
  color: rgba(255,100,80,0.6);
  margin-top: 10px;
  letter-spacing: .02em;
}

/* ── CLAIM OVERLAY ────────────────────────────────── */
#phaesto-overlay .claim-form {
  max-width: 400px; width: 90%; text-align: center;
  animation: ph-rise 400ms ease both;
}
#phaesto-overlay .claim-title {
  font-family: 'Cormorant SC', serif;
  font-size: 16px; letter-spacing: .18em;
  text-transform: uppercase; font-weight: 300;
  color: rgba(255,255,255,0.75);
  margin-bottom: 10px;
}
#phaesto-overlay .claim-sub {
  font-size: 13px; color: rgba(255,255,255,0.25);
  letter-spacing: .04em; margin-bottom: 32px;
}
#phaesto-overlay .claim-input {
  display: block; width: 100%;
  padding: 13px 16px; margin-bottom: 14px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.08);
  border-bottom-color: rgba(255,255,255,0.14);
  color: rgba(255,255,255,0.85);
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 15px; letter-spacing: .02em; outline: none;
  transition: border-color .25s;
}
#phaesto-overlay .claim-input:focus { border-color: rgba(255,255,255,0.22); }
#phaesto-overlay .claim-input::placeholder { color: rgba(255,255,255,0.18); }
#phaesto-overlay .claim-btn {
  display: inline-flex; align-items: center; gap: 8px;
  margin-top: 8px; padding: 14px 36px;
  border: 1px solid rgba(255,255,255,0.10);
  background: transparent;
  color: rgba(255,255,255,0.55);
  font-family: 'Cormorant SC', serif;
  font-size: 10px; letter-spacing: .22em; text-transform: uppercase;
  cursor: pointer; transition: all .3s;
}
#phaesto-overlay .claim-btn:hover {
  border-color: rgba(255,255,255,0.28);
  color: rgba(255,255,255,0.88);
  background: rgba(255,255,255,0.03);
}
#phaesto-overlay .claim-success {
  animation: ph-rise 400ms ease both;
  text-align: center;
}
#phaesto-overlay .claim-success-title {
  font-family: 'Cormorant SC', serif;
  font-size: 13px; letter-spacing: .14em;
  color: rgba(255,255,255,0.45);
  margin-bottom: 20px;
}
#phaesto-overlay .claim-success-link {
  font-family: 'Courier New', monospace;
  font-size: 11px; color: rgba(255,255,255,0.3);
  word-break: break-all; margin-bottom: 16px;
  line-height: 1.8;
  padding: 12px;
  border: 1px solid rgba(255,255,255,0.06);
}
`;
    var styleEl = document.createElement('style');
    styleEl.id = 'phaesto-nfc-styles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  function createOverlay() {
    var overlay = el('div', { id: 'phaesto-overlay' });
    document.body.appendChild(overlay);
    return overlay;
  }

  function getSigilSrc() {
    return '/assets/sigil-logo.png';
  }

  // ========== VERIFY FLOW ==========
  if (pathname.indexOf('/verify/') !== -1) {
    var verifyMatch = pathname.match(/\/verify\/([^/?#]+)/);
    if (verifyMatch) {
      var token = verifyMatch[1];

      injectStyles();
      var loadOverlay = createOverlay();
      var sigilImg = el('img', { src: '/assets/sigil-logo.png', class: 'sigil-pulse', alt: '' });
      var loadText = el('div', { class: 'overlay-text', textContent: 'Verifying' });
      var scanBar = el('div', { class: 'overlay-scan' });
      loadOverlay.appendChild(sigilImg);
      loadOverlay.appendChild(loadText);
      loadOverlay.appendChild(scanBar);

      function waitForSupabase(cb, tries) {
        tries = tries || 0;
        if (window._phaestoSupabase) { cb(window._phaestoSupabase); return; }
        if (tries > 20) {
          loadText.textContent = 'Could not connect. Please reload.';
          return;
        }
        setTimeout(function () { waitForSupabase(cb, tries + 1); }, 100);
      }

      waitForSupabase(function (sb) {
        var decoded;
        try { decoded = JSON.parse(atob(decodeURIComponent(token))); } catch (e) {
          loadOverlay.innerHTML = '';
          loadOverlay.appendChild(el('div', { class: 'overlay-error', textContent: 'This verification link is not valid.' }));
          return;
        }
        if (!decoded || !decoded.id) {
          loadOverlay.innerHTML = '';
          loadOverlay.appendChild(el('div', { class: 'overlay-error', textContent: 'This verification link is not valid.' }));
          return;
        }

        sb.from('pieces')
          .select('id, piece_id, piece_name, metal, weight_grams, forge_date, edition_number, founder_note')
          .eq('id', decoded.id)
          .single()
          .then(function (pieceRes) {
            if (pieceRes.error || !pieceRes.data) {
              loadOverlay.innerHTML = '';
              loadOverlay.appendChild(el('div', { class: 'overlay-error', textContent: 'Piece not found in the ledger.' }));
              return;
            }
            var piece = pieceRes.data;

            sb.from('ownership')
              .select('owner_name, owner_email, claimed_at, piece_id')
              .eq('piece_id', piece.piece_id)
              .eq('is_current_owner', true)
              .single()
              .then(function (ownerRes) {
                var owner = ownerRes.data ? {
                  name:       ownerRes.data.owner_name,
                  email:      ownerRes.data.owner_email,
                  claimed_at: ownerRes.data.claimed_at,
                  piece_id:   ownerRes.data.piece_id
                } : null;

                sb.from('transfer_log')
                  .select('transferred_at, from_owner_email, to_owner_email')
                  .eq('piece_id', piece.piece_id)
                  .order('transferred_at', { ascending: true })
                  .then(function (txRes) {
                    var transfers = txRes.data || [];
                    if (loadOverlay && loadOverlay.parentNode) {
                      loadOverlay.parentNode.removeChild(loadOverlay);
                    }
                    renderCertificate({ piece: piece, owner: owner, transferLog: transfers }, token);
                  });
              });
          });
      });
    }
  }

  // ========== CLAIM FLOW ==========
  else if (pathname.indexOf('/transfer/claim/') !== -1) {
    var claimMatch = pathname.match(/\/transfer\/claim\/([^/?#]+)/);
    if (claimMatch) {
      injectStyles();
      var transferCode = claimMatch[1];
      var overlay = createOverlay();

      var form = el('div', { class: 'claim-form' }, [
        el('div', { class: 'claim-title', textContent: 'Claim Ownership' }),
        el('div', { class: 'claim-sub', textContent: 'Enter your details to record this transfer.' }),
        el('input', { class: 'claim-input', type: 'text', placeholder: 'Your name', id: 'claim-name' }),
        el('input', { class: 'claim-input', type: 'email', placeholder: 'Your email', id: 'claim-email' }),
        el('button', { class: 'claim-btn', type: 'button', id: 'claim-submit', textContent: 'Claim Ownership' })
      ]);
      overlay.appendChild(form);

      document.getElementById('claim-submit').addEventListener('click', function () {
        var name = document.getElementById('claim-name').value.trim();
        var email = document.getElementById('claim-email').value.trim();
        if (!name || !email) return;

        this.textContent = 'Recording\u2026';
        this.disabled = true;
        var btn = this;

        function waitForSupabase(cb, tries) {
          tries = tries || 0;
          if (window._phaestoSupabase) { cb(window._phaestoSupabase); return; }
          if (tries > 20) return;
          setTimeout(function () { waitForSupabase(cb, tries + 1); }, 100);
        }

        waitForSupabase(function (sb) {
          sb.from('ownership')
            .select('id, piece_id, transfer_code, transfer_code_expires_at, transfer_pending, owner_email')
            .eq('transfer_code', transferCode)
            .eq('transfer_pending', true)
            .eq('is_current_owner', true)
            .single()
            .then(function (res) {
              if (res.error || !res.data) {
                form.innerHTML = '';
                form.appendChild(el('div', { class: 'overlay-error', textContent: 'This transfer code is invalid or has expired.' }));
                return;
              }
              var row = res.data;
              if (new Date(row.transfer_code_expires_at) < new Date()) {
                form.innerHTML = '';
                form.appendChild(el('div', { class: 'overlay-error', textContent: 'This transfer code has expired.' }));
                return;
              }

              var now = new Date().toISOString();
              var prevOwnerId = row.id;
              var prevOwnerEmail = row.owner_email;
              var pieceId = row.piece_id;

              sb.from('ownership')
                .update({
                  is_current_owner:         false,
                  transfer_pending:         false,
                  transfer_code:            null,
                  transfer_code_expires_at: null,
                  transfer_to_email:        null
                })
                .eq('id', prevOwnerId)
                .then(function (updateRes) {
                  if (updateRes.error) {
                    btn.textContent = 'Claim Ownership'; btn.disabled = false;
                    form.insertBefore(el('div', { class: 'overlay-error', textContent: 'Something went wrong. Please try again.' }), btn);
                    return;
                  }

                  sb.from('ownership')
                    .insert({
                      piece_id:         pieceId,
                      owner_name:       name,
                      owner_email:      email,
                      claimed_at:       now,
                      is_current_owner: true
                    })
                    .then(function (insertRes) {
                      if (insertRes.error) {
                        btn.textContent = 'Claim Ownership'; btn.disabled = false;
                        form.insertBefore(el('div', { class: 'overlay-error', textContent: 'Something went wrong. Please try again.' }), btn);
                        return;
                      }

                      sb.from('transfer_log').insert({
                        piece_id:         pieceId,
                        from_owner_email: prevOwnerEmail,
                        to_owner_email:   email,
                        to_owner:         name,
                        transferred_at:   now
                      });

                      sb.from('pieces').select('id').eq('piece_id', pieceId).single()
                        .then(function (pRes) {
                          var newToken = btoa(JSON.stringify({ id: pRes.data ? pRes.data.id : pieceId, ts: now }));
                          var verifyUrl = SITE + '/verify/' + newToken;

                          form.remove();
                          var success = el('div', { class: 'claim-success' }, [
                            el('div', { class: 'claim-success-title', textContent: 'Ownership recorded.' }),
                            el('div', { class: 'claim-success-link', id: 'claim-link', textContent: verifyUrl }),
                            el('button', { class: 'claim-btn', id: 'claim-copy', textContent: 'Copy Link' })
                          ]);
                          overlay.appendChild(success);

                          document.getElementById('claim-copy').addEventListener('click', function () {
                            navigator.clipboard.writeText(verifyUrl).then(function () {
                              document.getElementById('claim-copy').textContent = 'Copied';
                            });
                          });
                        });
                    });
                });
            });
        });
      });
    }
  }

  // ========== RENDER CERTIFICATE ==========
  function renderCertificate(data, token) {
    var piece = data.piece;
    var owner = data.owner;
    var transfers = data.transferLog;

    var cert = el('div', { id: 'phaesto-certificate' });

    // ── Hero ──
    var hero = el('div', { class: 'cert-hero' });
    hero.appendChild(el('div', { class: 'cert-wordmark', textContent: 'Phaesto Atelier' }));
    var sigilWrap = el('div', { class: 'cert-sigil-wrap' });
    sigilWrap.appendChild(el('img', { src: '/assets/sigil-logo.png', class: 'cert-sigil', alt: '' }));
    hero.appendChild(sigilWrap);
    hero.appendChild(el('h1', { class: 'cert-piece-name', textContent: piece.piece_name }));
    var badge = el('div', { class: 'cert-edition-badge' });
    badge.appendChild(el('span', { textContent: 'Edition' }));
    badge.appendChild(el('span', { class: 'badge-num', textContent: padEdition(piece.edition_number) }));
    badge.appendChild(el('span', { textContent: '/ Sterling Silver' }));
    hero.appendChild(badge);
    cert.appendChild(hero);

    // ── Data grid ──
    var grid = el('div', { class: 'cert-grid' });
    function cell(label, value, accent) {
      var c = el('div', { class: 'cert-cell' });
      c.appendChild(el('div', { class: 'cert-cell-label', textContent: label }));
      c.appendChild(el('div', { class: 'cert-cell-value' + (accent ? ' accent' : ''), textContent: value }));
      return c;
    }
    grid.appendChild(cell('Metal', piece.metal));
    grid.appendChild(cell('Weight', piece.weight_grams + 'g'));
    grid.appendChild(cell('Origin', formatForgeDate(piece.forge_date)));
    grid.appendChild(cell('Edition', padEdition(piece.edition_number), true));
    cert.appendChild(grid);

    // ── Owner strip ──
    if (owner) {
      var strip = el('div', { class: 'cert-owner-strip' });
      var icon = el('div', { class: 'cert-owner-icon', innerHTML: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>' });
      var ownerInfo = el('div', {});
      ownerInfo.appendChild(el('div', { class: 'cert-owner-name', textContent: owner.name }));
      ownerInfo.appendChild(el('div', { class: 'cert-owner-since', textContent: 'Since ' + formatDate(owner.claimed_at) }));
      strip.appendChild(icon);
      strip.appendChild(ownerInfo);
      cert.appendChild(strip);
    }

    // ── Founder note ──
    if (piece.founder_note) {
      var noteWrap = el('div', { class: 'cert-note-wrap' });
      noteWrap.appendChild(el('div', { class: 'cert-founder-note', textContent: piece.founder_note }));
      cert.appendChild(noteWrap);
    }

    // ── Provenance ──
    if (transfers && transfers.length > 0) {
      var prov = el('div', { class: 'cert-provenance' });
      prov.appendChild(el('div', { class: 'cert-section-label', textContent: 'Provenance' }));
      transfers.forEach(function (t, i) {
        var row = el('div', { class: 'cert-tx-row' });
        var dot = el('div', { class: 'cert-tx-dot' + (i === 0 ? ' first' : '') });
        var meta = el('div', { class: 'cert-tx-meta' });
        var parties = i === 0
          ? 'Issued by the Atelier \u2192 ' + t.to_owner_email
          : t.from_owner_email + ' \u2192 ' + t.to_owner_email;
        meta.appendChild(el('div', { class: 'cert-tx-parties', textContent: parties }));
        meta.appendChild(el('div', { class: 'cert-tx-date', textContent: formatDate(t.transferred_at) }));
        row.appendChild(dot);
        row.appendChild(meta);
        prov.appendChild(row);
      });
      cert.appendChild(prov);
    }

    // ── Transfer portal ──
    var portal = el('div', { class: 'cert-transfer-portal' });
    var triggerBtn = el('button', {
      class: 'cert-transfer-trigger',
      id: 'cert-transfer-btn',
      innerHTML: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg> Transfer Ownership'
    });
    portal.appendChild(triggerBtn);
    cert.appendChild(portal);

    document.body.insertBefore(cert, document.body.firstChild);

    triggerBtn.addEventListener('click', function () {
      if (document.getElementById('cert-transfer-form')) return;
      triggerBtn.style.display = 'none';

      var formDiv = el('div', { class: 'cert-transfer-form', id: 'cert-transfer-form' });
      formDiv.appendChild(el('label', { class: 'cert-form-label', textContent: 'Your email (current owner)' }));
      formDiv.appendChild(el('input', { class: 'cert-input', type: 'email', placeholder: 'owner@example.com', id: 'transfer-email' }));
      formDiv.appendChild(el('button', { class: 'cert-btn', id: 'transfer-generate', textContent: 'Generate Transfer Code' }));
      portal.appendChild(formDiv);

      document.getElementById('transfer-generate').addEventListener('click', function () {
        var sellerEmail = document.getElementById('transfer-email').value.trim();
        if (!sellerEmail) return;

        this.textContent = 'Generating\u2026';
        this.disabled = true;
        var genBtn = this;

        function waitForSupabase(cb, tries) {
          tries = tries || 0;
          if (window._phaestoSupabase) { cb(window._phaestoSupabase); return; }
          if (tries > 20) { return; }
          setTimeout(function () { waitForSupabase(cb, tries + 1); }, 100);
        }

        waitForSupabase(function (sb) {
          sb.from('ownership')
            .select('id, owner_email')
            .eq('piece_id', piece.piece_id)
            .eq('is_current_owner', true)
            .single()
            .then(function (ownerCheck) {
              if (ownerCheck.error || !ownerCheck.data) {
                formDiv.innerHTML = '';
                formDiv.appendChild(el('div', { class: 'cert-msg-error', textContent: 'Could not verify ownership.' }));
                return;
              }
              if (ownerCheck.data.owner_email.toLowerCase() !== sellerEmail.toLowerCase()) {
                formDiv.innerHTML = '';
                formDiv.appendChild(el('div', { class: 'cert-msg-error', textContent: 'Email does not match the current owner.' }));
                return;
              }

              var code = Array.from(crypto.getRandomValues(new Uint8Array(6)))
                .map(function (b) { return b.toString(16).padStart(2, '0'); })
                .join('').toUpperCase().slice(0, 8);

              var expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

              sb.from('ownership')
                .update({
                  transfer_code:            code,
                  transfer_code_expires_at: expiresAt,
                  transfer_pending:         true
                })
                .eq('id', ownerCheck.data.id)
                .then(function (res) {
                  if (res.error) {
                    genBtn.textContent = 'Generate Transfer Code'; genBtn.disabled = false;
                    formDiv.innerHTML = '';
                    formDiv.appendChild(el('div', { class: 'cert-msg-error', textContent: 'Could not generate transfer code. Please try again.' }));
                    return;
                  }

                  // FIX: hardcoded to phaestoatelier.com, never window.location.origin
                  var claimUrl = SITE + '/transfer/claim/' + code;
                  var codeBox = el('div', { class: 'cert-code-box' });
                  codeBox.appendChild(el('div', { class: 'cert-code', textContent: code }));
                  codeBox.appendChild(el('div', { class: 'cert-code-info', textContent: 'Share this code with the new owner. Expires in 48\u202Fhours.' }));
                  codeBox.appendChild(el('div', { class: 'cert-code-url', textContent: claimUrl }));
                  var copyRow = el('div', { style: { display:'flex', gap:'10px', justifyContent:'center', marginTop:'4px' } });
                  copyRow.appendChild(el('button', { class: 'cert-copy-btn', id: 'copy-code-btn', textContent: 'Copy Code' }));
                  copyRow.appendChild(el('button', { class: 'cert-copy-btn', id: 'copy-url-btn', textContent: 'Copy Link' }));
                  codeBox.appendChild(copyRow);
                  formDiv.innerHTML = '';
                  formDiv.appendChild(codeBox);

                  document.getElementById('copy-code-btn').addEventListener('click', function () {
                    navigator.clipboard.writeText(code).then(function () {
                      document.getElementById('copy-code-btn').textContent = 'Copied \u2713';
                    });
                  });
                  document.getElementById('copy-url-btn').addEventListener('click', function () {
                    navigator.clipboard.writeText(claimUrl).then(function () {
                      document.getElementById('copy-url-btn').textContent = 'Copied \u2713';
                    });
                  });
                });
            });
        });
      });
    });
  }

})();
