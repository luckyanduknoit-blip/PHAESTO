(function () {
  'use strict';

  var pathname = window.location.pathname;

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

  function dismissGhostScreen() {
    var ghost = document.getElementById('ghost-screen');
    if (ghost) {
      ghost.style.transition = 'opacity 600ms ease';
      ghost.style.opacity = '0';
      setTimeout(function () { ghost.style.display = 'none'; }, 650);
    }
    var pageContainer = document.getElementById('page-container');
    if (pageContainer) pageContainer.style.display = 'none';
    var sigilTrigger = document.getElementById('sigil-trigger');
    if (sigilTrigger) sigilTrigger.style.display = 'none';
    var templeOverlay = document.getElementById('temple-overlay');
    if (templeOverlay) templeOverlay.style.display = 'none';
    window.__PHAESTO_NFC_ROUTE__ = true;
  }

  function injectStyles() {
    if (document.getElementById('phaesto-nfc-styles')) return;
    var css = [
      '@keyframes phaesto-fade-in { from { opacity: 0; } to { opacity: 1; } }',
      '#phaesto-overlay {',
      '  position: fixed; top: 0; left: 0; width: 100%; height: 100%;',
      '  background: #0a0a0a; z-index: 99999;',
      '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
      '  font-family: "Cormorant Garamond", Georgia, serif;',
      '  color: rgba(255,255,255,0.85);',
      '}',
      '#phaesto-overlay .overlay-error {',
      '  font-size: 16px; color: rgba(255,255,255,0.6);',
      '  animation: phaesto-fade-in 400ms ease;',
      '}',
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
      '#phaesto-overlay .claim-input:focus { border-color: rgba(255,255,255,0.25); }',
      '#phaesto-overlay .claim-input::placeholder { color: rgba(255,255,255,0.25); }',
      '#phaesto-overlay .claim-btn {',
      '  display: inline-block; margin-top: 8px; padding: 14px 36px;',
      '  border: 1px solid rgba(255,255,255,0.10); background: transparent;',
      '  color: rgba(255,255,255,0.7); font-family: "Cormorant Garamond", Georgia, serif;',
      '  font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase;',
      '  cursor: pointer; transition: border-color 0.3s ease, color 0.3s ease;',
      '}',
      '#phaesto-overlay .claim-btn:hover { border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.9); }',
      '#phaesto-overlay .claim-success { animation: phaesto-fade-in 400ms ease; text-align: center; }',
      '#phaesto-overlay .claim-success-title { font-size: 16px; letter-spacing: 0.1em; margin: 0 0 24px; color: rgba(255,255,255,0.7); }',
      '#phaesto-overlay .claim-success-link { font-family: monospace; font-size: 13px; color: rgba(255,255,255,0.6); word-break: break-all; margin: 0 0 16px; line-height: 1.8; }'
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

  if (pathname.indexOf('/transfer/claim/') === 0 && pathname.length > '/transfer/claim/'.length) {
    window.__PHAESTO_NFC_ROUTE__ = true;
    window.addEventListener('DOMContentLoaded', function () { dismissGhostScreen(); });
    if (document.readyState !== 'loading') dismissGhostScreen();

    injectStyles();
    var transferCode = pathname.slice('/transfer/claim/'.length);
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

      this.textContent = 'Claiming…';
      this.disabled = true;

      fetch('/api/transfer/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transfer_code: transferCode,
          new_owner_name: name,
          new_owner_email: email
        })
      })
        .then(function (r) {
          if (!r.ok) throw new Error('failed');
          return r.json();
        })
        .then(function (data) {
          form.remove();
          var verifyUrl = window.location.origin + '/verify/' + data.new_token;
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
        })
        .catch(function () {
          form.innerHTML = '';
          form.appendChild(el('div', { class: 'overlay-error', textContent: 'This transfer code is invalid or has expired.' }));
        });
    });
  }
})();
