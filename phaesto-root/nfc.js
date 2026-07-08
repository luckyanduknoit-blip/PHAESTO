(function () {
  'use strict';

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
    return 'Forged \u2014 ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function padEdition(n) {
    var s = String(n);
    while (s.length < 3) s = '0' + s;
    return 'No. ' + s;
  }

  function injectStyles() {
    if (document.getElementById('phaesto-nfc-styles')) return;
    var css = [
      '@keyframes phaesto-fade-in { from { opacity: 0; } to { opacity: 1; } }',
      '@keyframes phaesto-wall-open { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }',
      '@keyframes phaesto-pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }',
      '#phaesto-overlay {',
      '  position: fixed; top: 0; left: 0; width: 100%; height: 100%;',
      '  background: #0a0a0a; z-index: 99999;',
      '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
      '  font-family: "Cormorant Garamond", Georgia, serif;',
      '  color: rgba(255,255,255,0.85);',
      '}',
      '#phaesto-overlay .sigil-pulse {',
      '  width: 60px; height: 60px; opacity: 0.6;',
      '  animation: phaesto-pulse 2s ease-in-out infinite;',
      '}',
      '#phaesto-overlay .overlay-text {',
      '  margin-top: 24px; font-size: 14px; letter-spacing: 0.15em;',
      '  text-transform: uppercase; color: rgba(255,255,255,0.45);',
      '}',
      '#phaesto-overlay .overlay-error {',
      '  font-size: 16px; color: rgba(255,255,255,0.6);',
      '  animation: phaesto-fade-in 400ms ease;',
      '}',
      '#phaesto-certificate {',
      '  background: #0a0a0a; padding: 60px 20px 80px;',
      '  font-family: "Cormorant Garamond", Georgia, serif;',
      '  color: rgba(255,255,255,0.85);',
      '  animation: phaesto-wall-open 800ms cubic-bezier(0.16, 1, 0.3, 1);',
      '  border-bottom: 1px solid rgba(255,255,255,0.05);',
      '}',
      '#phaesto-certificate .cert-inner {',
      '  max-width: 600px; margin: 0 auto; text-align: center;',
      '}',
      '#phaesto-certificate .cert-sigil { width: 48px; height: 48px; opacity: 0.5; margin-bottom: 32px; }',
      '#phaesto-certificate .cert-piece-name {',
      '  font-size: 28px; letter-spacing: 0.2em; text-transform: uppercase;',
      '  font-weight: 300; margin: 0 0 8px;',
      '}',
      '#phaesto-certificate .cert-edition {',
      '  font-size: 14px; letter-spacing: 0.15em; color: rgba(255,255,255,0.45);',
      '  margin: 0 0 40px;',
      '}',
      '#phaesto-certificate .cert-divider {',
      '  width: 40px; height: 1px; background: rgba(255,255,255,0.10);',
      '  margin: 0 auto 40px;',
      '}',
      '#phaesto-certificate .cert-detail {',
      '  font-size: 14px; letter-spacing: 0.1em; color: rgba(255,255,255,0.45);',
      '  margin: 0 0 12px; text-transform: uppercase;',
      '}',
      '#phaesto-certificate .cert-detail-value {',
      '  font-size: 16px; color: rgba(255,255,255,0.85); margin: 0 0 28px;',
      '}',
      '#phaesto-certificate .cert-founder-note {',
      '  font-style: italic; font-size: 16px; color: rgba(255,255,255,0.6);',
      '  margin: 40px auto 0; max-width: 480px; line-height: 1.8;',
      '  border-top: 1px solid rgba(255,255,255,0.10); padding-top: 32px;',
      '}',
      '#phaesto-certificate .cert-transfers {',
      '  margin-top: 48px; border-top: 1px solid rgba(255,255,255,0.10); padding-top: 32px;',
      '}',
      '#phaesto-certificate .cert-transfers-title {',
      '  font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;',
      '  color: rgba(255,255,255,0.35); margin: 0 0 20px;',
      '}',
      '#phaesto-certificate .cert-transfer-entry {',
      '  font-size: 13px; color: rgba(255,255,255,0.45); margin: 0 0 8px;',
      '}',
      '#phaesto-certificate .cert-btn {',
      '  display: inline-block; margin-top: 48px; padding: 14px 36px;',
      '  border: 1px solid rgba(255,255,255,0.10); background: transparent;',
      '  color: rgba(255,255,255,0.7); font-family: "Cormorant Garamond", Georgia, serif;',
      '  font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase;',
      '  cursor: pointer; transition: border-color 0.3s ease, color 0.3s ease;',
      '}',
      '#phaesto-certificate .cert-btn:hover {',
      '  border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.9);',
      '}',
      '#phaesto-certificate .cert-transfer-form {',
      '  margin-top: 24px; animation: phaesto-fade-in 400ms ease;',
      '}',
      '#phaesto-certificate .cert-input {',
      '  display: block; width: 100%; max-width: 400px; margin: 0 auto 16px;',
      '  padding: 12px 16px; background: transparent;',
      '  border: 1px solid rgba(255,255,255,0.10); color: rgba(255,255,255,0.85);',
      '  font-family: "Cormorant Garamond", Georgia, serif; font-size: 15px;',
      '  letter-spacing: 0.05em; outline: none; box-sizing: border-box;',
      '}',
      '#phaesto-certificate .cert-input:focus {',
      '  border-color: rgba(255,255,255,0.25);',
      '}',
      '#phaesto-certificate .cert-input::placeholder {',
      '  color: rgba(255,255,255,0.25);',
      '}',
      '#phaesto-certificate .cert-code-box {',
      '  margin-top: 24px; padding: 24px; border: 1px solid rgba(255,255,255,0.10);',
      '  animation: phaesto-fade-in 400ms ease;',
      '}',
      '#phaesto-certificate .cert-code {',
      '  font-family: monospace; font-size: 24px; letter-spacing: 0.3em;',
      '  color: rgba(255,255,255,0.9); margin: 0 0 12px;',
      '}',
      '#phaesto-certificate .cert-code-info {',
      '  font-size: 13px; color: rgba(255,255,255,0.4); line-height: 1.8;',
      '}',
      '#phaesto-certificate .cert-copy-btn {',
      '  display: inline-block; margin-top: 12px; padding: 8px 20px;',
      '  border: 1px solid rgba(255,255,255,0.10); background: transparent;',
      '  color: rgba(255,255,255,0.5); font-family: "Cormorant Garamond", Georgia, serif;',
      '  font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;',
      '  cursor: pointer;',
      '}',
      '#phaesto-certificate .cert-msg-error {',
      '  color: rgba(255,255,255,0.5); font-size: 14px; margin-top: 12px;',
      '}',
      '',
      '/* Claim page overlay form */',
      '#phaesto-overlay .claim-form {',
      '  max-width: 400px; width: 90%; text-align: center;',
      '  animation: phaesto-fade-in 400ms ease;',
      '}',
      '#phaesto-overlay .claim-title {',
      '  font-size: 20px; letter-spacing: 0.15em; text-transform: uppercase;',
      '  font-weight: 300; margin: 0 0 32px;',
      '}',
      '#phaesto-overlay .claim-input {',
      '  display: block; width: 100%; padding: 12px 16px; margin-bottom: 16px;',
      '  background: transparent; border: 1px solid rgba(255,255,255,0.10);',
      '  color: rgba(255,255,255,0.85); font-family: "Cormorant Garamond", Georgia, serif;',
      '  font-size: 15px; letter-spacing: 0.05em; outline: none; box-sizing: border-box;',
      '}',
      '#phaesto-overlay .claim-input:focus {',
      '  border-color: rgba(255,255,255,0.25);',
      '}',
      '#phaesto-overlay .claim-input::placeholder {',
      '  color: rgba(255,255,255,0.25);',
      '}',
      '#phaesto-overlay .claim-btn {',
      '  display: inline-block; margin-top: 8px; padding: 14px 36px;',
      '  border: 1px solid rgba(255,255,255,0.10); background: transparent;',
      '  color: rgba(255,255,255,0.7); font-family: "Cormorant Garamond", Georgia, serif;',
      '  font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase;',
      '  cursor: pointer; transition: border-color 0.3s ease, color 0.3s ease;',
      '}',
      '#phaesto-overlay .claim-btn:hover {',
      '  border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.9);',
      '}',
      '#phaesto-overlay .claim-success {',
      '  animation: phaesto-fade-in 400ms ease; text-align: center;',
      '}',
      '#phaesto-overlay .claim-success-title {',
      '  font-size: 16px; letter-spacing: 0.1em; margin: 0 0 24px;',
      '  color: rgba(255,255,255,0.7);',
      '}',
      '#phaesto-overlay .claim-success-link {',
      '  font-family: monospace; font-size: 13px; color: rgba(255,255,255,0.6);',
      '  word-break: break-all; margin: 0 0 16px; line-height: 1.8;',
      '}',
    ].join('\n');

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
    return './assets/sigil-logo.png';
  }

  // ========== VERIFY FLOW ==========
  if (pathname.indexOf('/verify/') !== -1) {
    var verifyMatch = pathname.match(/\/verify\/([^/?#]+)/);
    if (verifyMatch) {
      var token = verifyMatch[1];

      function waitForSupabase(cb, tries) {
        tries = tries || 0;
        if (window._phaestoSupabase) { cb(window._phaestoSupabase); return; }
        if (tries > 20) return;
        setTimeout(function () { waitForSupabase(cb, tries + 1); }, 100);
      }

      waitForSupabase(function (sb) {
        var decoded;
        try { decoded = JSON.parse(atob(token)); } catch (e) { return; }
        if (!decoded || !decoded.id) return;

        sb.from('pieces')
          .select('id, piece_id, piece_name, metal, weight_grams, forge_date, edition_number, founder_note')
          .eq('id', decoded.id)
          .single()
          .then(function (pieceRes) {
            if (pieceRes.error || !pieceRes.data) return;
            var piece = pieceRes.data;

            // FIX: was piece_owners — real table is ownership
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
                    injectStyles();
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
        el('input', { class: 'claim-input', type: 'text', placeholder: 'Your name', id: 'claim-name' }),
        el('input', { class: 'claim-input', type: 'email', placeholder: 'Your email', id: 'claim-email' }),
        el('button', { class: 'claim-btn', type: 'button', id: 'claim-submit', textContent: 'Claim Ownership' })
      ]);
      overlay.appendChild(form);

      document.getElementById('claim-submit').addEventListener('click', function () {
        var name = document.getElementById('claim-name').value.trim();
        var email = document.getElementById('claim-email').value.trim();
        if (!name || !email) return;

        this.textContent = 'Claiming\u2026';
        this.disabled = true;
        var btn = this;

        function waitForSupabase(cb, tries) {
          tries = tries || 0;
          if (window._phaestoSupabase) { cb(window._phaestoSupabase); return; }
          if (tries > 20) return;
          setTimeout(function () { waitForSupabase(cb, tries + 1); }, 100);
        }

        waitForSupabase(function (sb) {
          // FIX: was transfer_codes table — transfer code lives on the ownership row
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

              // 1. Mark old owner row as no longer current + clear transfer fields
              sb.from('ownership')
                .update({
                  is_current_owner:          false,
                  transfer_pending:          false,
                  transfer_code:             null,
                  transfer_code_expires_at:  null,
                  transfer_to_email:         null
                })
                .eq('id', prevOwnerId)
                .then(function (updateRes) {
                  if (updateRes.error) {
                    btn.textContent = 'Claim Ownership'; btn.disabled = false;
                    form.insertBefore(el('div', { class: 'overlay-error', textContent: 'Something went wrong. Please try again.' }), btn);
                    return;
                  }

                  // 2. Insert new owner row
                  sb.from('ownership')
                    .insert({
                      piece_id:        pieceId,
                      owner_name:      name,
                      owner_email:     email,
                      claimed_at:      now,
                      is_current_owner: true
                    })
                    .then(function (insertRes) {
                      if (insertRes.error) {
                        btn.textContent = 'Claim Ownership'; btn.disabled = false;
                        form.insertBefore(el('div', { class: 'overlay-error', textContent: 'Something went wrong. Please try again.' }), btn);
                        return;
                      }

                      // 3. Write transfer_log entry
                      sb.from('transfer_log').insert({
                        piece_id:          pieceId,
                        from_owner_email:  prevOwnerEmail,
                        to_owner_email:    email,
                        to_owner:          name,
                        transferred_at:    now
                      });

                      // 4. Build new verify token and show success
                      // Need pieces.id (uuid) for the token — fetch it via piece_id
                      sb.from('pieces').select('id').eq('piece_id', pieceId).single()
                        .then(function (pRes) {
                          var newToken = btoa(JSON.stringify({ id: pRes.data ? pRes.data.id : pieceId, ts: now }));
                          var verifyUrl = window.location.origin + '/verify/' + newToken;

                          form.remove();
                          var success = el('div', { class: 'claim-success' }, [
                            el('div', { class: 'claim-success-title', textContent: 'Ownership recorded. Your verification link:' }),
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
    var inner = el('div', { class: 'cert-inner' });

    inner.appendChild(el('img', { src: getSigilSrc(), class: 'cert-sigil', alt: '' }));
    inner.appendChild(el('h1', { class: 'cert-piece-name', textContent: piece.piece_name }));
    inner.appendChild(el('div', { class: 'cert-edition', textContent: padEdition(piece.edition_number) }));
    inner.appendChild(el('div', { class: 'cert-divider' }));

    inner.appendChild(el('div', { class: 'cert-detail', textContent: 'Metal' }));
    inner.appendChild(el('div', { class: 'cert-detail-value', textContent: piece.metal }));

    inner.appendChild(el('div', { class: 'cert-detail', textContent: 'Weight' }));
    inner.appendChild(el('div', { class: 'cert-detail-value', textContent: piece.weight_grams + 'g' }));

    inner.appendChild(el('div', { class: 'cert-detail', textContent: 'Origin' }));
    inner.appendChild(el('div', { class: 'cert-detail-value', textContent: formatForgeDate(piece.forge_date) }));

    inner.appendChild(el('div', { class: 'cert-divider' }));

    if (owner) {
      inner.appendChild(el('div', { class: 'cert-detail', textContent: 'Owner' }));
      inner.appendChild(el('div', { class: 'cert-detail-value', textContent: owner.name }));

      inner.appendChild(el('div', { class: 'cert-detail', textContent: 'Claimed' }));
      inner.appendChild(el('div', { class: 'cert-detail-value', textContent: formatDate(owner.claimed_at) }));
    }

    if (piece.founder_note) {
      inner.appendChild(el('div', { class: 'cert-founder-note', textContent: '\u201C' + piece.founder_note + '\u201D' }));
    }

    if (transfers && transfers.length > 0) {
      var transferSection = el('div', { class: 'cert-transfers' });
      transferSection.appendChild(el('div', { class: 'cert-transfers-title', textContent: 'Transfer History' }));
      transfers.forEach(function (t) {
        transferSection.appendChild(el('div', {
          class: 'cert-transfer-entry',
          textContent: formatDate(t.transferred_at) + ' \u2014 ' + t.from_owner_email + ' \u2192 ' + t.to_owner_email
        }));
      });
      inner.appendChild(transferSection);
    }

    var transferBtn = el('button', { class: 'cert-btn', id: 'cert-transfer-btn', textContent: 'Transfer Ownership' });
    inner.appendChild(transferBtn);

    cert.appendChild(inner);
    document.body.insertBefore(cert, document.body.firstChild);

    transferBtn.addEventListener('click', function () {
      if (document.getElementById('cert-transfer-form')) return;
      var formDiv = el('div', { class: 'cert-transfer-form', id: 'cert-transfer-form' }, [
        el('input', { class: 'cert-input', type: 'email', placeholder: 'Your email (current owner)', id: 'transfer-email' }),
        el('button', { class: 'cert-btn', id: 'transfer-generate', textContent: 'Generate Transfer Code' })
      ]);
      transferBtn.after(formDiv);

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
          // FIX: was piece_owners — real table is ownership
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

              // FIX: was transfer_codes insert — write directly onto the ownership row
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

                  var claimUrl = window.location.origin + '/transfer/claim/' + code;
                  var codeBox = el('div', { class: 'cert-code-box' }, [
                    el('div', { class: 'cert-code', textContent: code }),
                    el('div', { class: 'cert-code-info', innerHTML: 'Share this code with the new owner. Expires in 48 hours.<br>They can claim at: ' + claimUrl }),
                    el('button', { class: 'cert-copy-btn', id: 'transfer-copy-code', textContent: 'Copy Code' })
                  ]);
                  formDiv.innerHTML = '';
                  formDiv.appendChild(codeBox);

                  document.getElementById('transfer-copy-code').addEventListener('click', function () {
                    navigator.clipboard.writeText(code).then(function () {
                      document.getElementById('transfer-copy-code').textContent = 'Copied';
                    });
                  });
                });
            });
        });
      });
    });
  }

})();
