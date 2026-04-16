/* =========================================
   PHAĒSTO ATELIER — THE DIGITAL CHAPEL
   Multi-page SPA: Ghost, Sigil Nav, Pages
   ========================================= */

(function() {
  'use strict';

  // If nfc.js has taken over this route, do nothing.
  if (window.__PHAESTO_NFC_ROUTE__) return;

  // === GLYPH SET ===
  var GLYPHS = [
    'ॐ', 'अ', 'ख', 'त', 'म', 'श', 'ह', 'ज', 'र', 'ण',
    'ग', 'द', 'भ', 'य', 'ल', 'व', 'प', 'स', 'क', 'न',
    '᳐', '᳑', '᳒',
    '⌇', '⍟', '⎔', '⌬', '⏣', '⏢', '⎈', '⍀', '⌖', '⌗',
    '⊕', '⊗', '⊘', '⊛', '⋈', '⋉', '⋊', '⟁', '⟐', '⟡',
    '◇', '◈', '◉', '◌', '◍', '⬡', '⬢', '△', '▽', '☉',
    '✦', '✧', '❖', '⚯', '☸', '✵', '⚶', '⚷'
  ];

  var FRAGMENTS = [
    { type: 'glyph' }, { type: 'glyph' },
    { type: 'word', text: 'something' }, { type: 'glyph' },
    { type: 'word', text: 'is' }, { type: 'word', text: 'listening' },
    { type: 'glyph' }, { type: 'glyph' },
    { type: 'word', text: 'the' }, { type: 'word', text: 'frequency' },
    { type: 'glyph' }, { type: 'word', text: 'shifts' },
    { type: 'glyph' }, { type: 'glyph' },
    { type: 'word', text: 'you' }, { type: 'glyph' },
    { type: 'word', text: 'were' }, { type: 'word', text: 'expected' },
    { type: 'glyph' }, { type: 'glyph' }, { type: 'glyph' }
  ];

  // === DOM REFS ===
  var ghostScreen = document.getElementById('ghost-screen');
  var sentenceEl = document.getElementById('ghost-sentence');
  var pageContainer = document.getElementById('page-container');
  var sigilTrigger = document.getElementById('sigil-trigger');
  var navOverlay = document.getElementById('nav-overlay');
  var templeOverlay = document.getElementById('temple-overlay');
  var navPageLinks = document.querySelectorAll('.nav-page-link');

  var currentPage = 'home';
  var navIsOpen = false;

  function randomGlyph() {
    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }

  function hapticPulse() {
    if (navigator.vibrate) navigator.vibrate(30);
  }


  // =============================================
  // GHOST SCREEN
  // =============================================
  function runSentenceSequence() {
    var currentIndex = 0;
    var wrapper = document.createElement('span');
    sentenceEl.appendChild(wrapper);

    function addNextFragment() {
      if (currentIndex >= FRAGMENTS.length) {
        setTimeout(function() {
          ghostScreen.classList.add('fade-out');
          pageContainer.classList.add('revealed');
          sigilTrigger.classList.add('visible');

          // Activate temple
          if (templeOverlay) templeOverlay.classList.add('active');

          setTimeout(function() {
            ghostScreen.style.display = 'none';
          }, 1200);
        }, 800);
        return;
      }

      var frag = FRAGMENTS[currentIndex];
      var span = document.createElement('span');

      if (frag.type === 'glyph') {
        span.className = 'glyph';
        span.textContent = randomGlyph();
        var cycleCount = 0;
        var glyphCycle = setInterval(function() {
          span.textContent = randomGlyph();
          cycleCount++;
          if (cycleCount > 4) clearInterval(glyphCycle);
        }, 100);
      } else {
        span.className = 'word';
        span.textContent = frag.text;
        hapticPulse();
      }

      if (currentIndex > 0) {
        wrapper.appendChild(document.createTextNode(' '));
      }

      span.style.animationDelay = '0ms';
      wrapper.appendChild(span);
      currentIndex++;

      var delay = frag.type === 'glyph' ? 180 : 320;
      setTimeout(addNextFragment, delay);
    }

    setTimeout(addNextFragment, 1000);
  }

  runSentenceSequence();


  // =============================================
  // SIGIL NAV TRIGGER
  // =============================================
  sigilTrigger.addEventListener('click', function() {
    sigilTrigger.classList.add('spinning');
    setTimeout(function() {
      sigilTrigger.classList.remove('spinning');
    }, 350);

    if (navIsOpen) {
      closeNav();
    } else {
      openNav();
    }
  });

  function openNav() {
    navIsOpen = true;
    navOverlay.classList.add('open');
    sigilTrigger.setAttribute('aria-expanded', 'true');
    navPageLinks.forEach(function(link) {
      link.classList.toggle('active', link.dataset.page === currentPage);
    });
  }

  function closeNav() {
    navIsOpen = false;
    navOverlay.classList.remove('open');
    sigilTrigger.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && navIsOpen) closeNav();
  });


  // =============================================
  // PAGE ROUTING
  // =============================================
  navPageLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      var targetPage = this.dataset.page;
      if (targetPage === currentPage) {
        closeNav();
        return;
      }
      navigateTo(targetPage);
    });
  });

  function navigateTo(pageName) {
    closeNav();
    var allPages = document.querySelectorAll('.page');
    allPages.forEach(function(p) {
      p.style.display = 'none';
      p.classList.remove('page-entering');
    });
    var targetEl = document.getElementById('page-' + pageName);
    if (targetEl) {
      targetEl.style.display = '';
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          targetEl.classList.add('page-entering');
        });
      });
    }
    window.scrollTo(0, 0);
    currentPage = pageName;
    initPageFeatures(pageName);
  }

  function initPageFeatures(pageName) {
    if (pageName === 'forge') {
      initForge();
    }
  }


  // =============================================
  // TEMPLE SCROLL DEPTH
  // =============================================
  function updateTempleDepth() {
    if (!templeOverlay || !templeOverlay.classList.contains('active')) return;
    var scrollY = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var progress = Math.min(scrollY / (docHeight || 1), 1);
    var colOpacity = 0.15 + progress * 0.2;
    var cols = templeOverlay.querySelectorAll('.temple-col');
    cols.forEach(function(col) { col.style.opacity = colOpacity; });
    var topArch = templeOverlay.querySelector('.temple-top-arch');
    if (topArch) topArch.style.opacity = 0.08 + progress * 0.15;
  }

  var templeRAF = false;
  window.addEventListener('scroll', function() {
    if (!templeRAF) {
      requestAnimationFrame(function() {
        updateTempleDepth();
        templeRAF = false;
      });
      templeRAF = true;
    }
  }, { passive: true });


  // =============================================
  // THE FORGE — Live Counter (Supabase) + Real Submit
  // =============================================

  // Never caches across sessions — always fetches fresh from Supabase on page visit
  // so the count reflects all submissions across all users in real time.

  function setCountDisplay(remaining) {
    var countEl = document.getElementById('forge-count');
    var submitBtn = document.getElementById('forge-submit-btn');
    if (!countEl) return;

    // Remove class, force reflow, re-add to restart the gold pulse animation
    countEl.classList.remove('updated');
    void countEl.offsetWidth;
    countEl.textContent = remaining;
    countEl.classList.add('updated');

    if (remaining <= 0 && submitBtn) {
      freezeForge(submitBtn);
    }
  }

  function freezeForge(btn) {
    btn.textContent = 'The Forge is Cold. Check back in the next epoch.';
    btn.disabled = true;
    btn.classList.add('forge-cold');
  }

  function fetchForgeCount() {
    // Always fetch live from the server — Supabase is the single source of truth
    fetch('/api/forge/count', { method: 'GET' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (typeof data.remaining === 'number' && data.remaining >= 0) {
          setCountDisplay(data.remaining);
        }
      })
      .catch(function() {
        // Silent fail — HTML default holds
      });
  }

  function initForge() {
    var forgeSubmitBtn = document.getElementById('forge-submit-btn');
    if (!forgeSubmitBtn || forgeSubmitBtn._bound) return;
    forgeSubmitBtn._bound = true;

    // Always fetch the live count when the Forge page is visited
    fetchForgeCount();

    forgeSubmitBtn.addEventListener('click', function() {
      var intent = (document.getElementById('forge-q1') || {}).value || '';
      var contact = (document.getElementById('forge-q2') || {}).value || '';

      intent = intent.trim();
      contact = contact.trim();

      if (!intent || !contact) {
        forgeSubmitBtn.textContent = 'Incomplete';
        forgeSubmitBtn.style.borderColor = '#8B4513';
        setTimeout(function() {
          forgeSubmitBtn.textContent = 'Submit';
          forgeSubmitBtn.style.borderColor = '';
        }, 2000);
        return;
      }

      // Basic email validation
      if (!contact.includes('@') || !contact.includes('.')) {
        forgeSubmitBtn.textContent = 'Enter a valid email';
        forgeSubmitBtn.style.borderColor = '#8B4513';
        setTimeout(function() {
          forgeSubmitBtn.textContent = 'Submit';
          forgeSubmitBtn.style.borderColor = '';
        }, 2000);
        return;
      }

      // Disable immediately to prevent double-submit
      forgeSubmitBtn.disabled = true;
      forgeSubmitBtn.textContent = 'Recording...';

      fetch('/api/forge/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: intent, contact: contact })
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) {
            hapticPulse();

            // Update the count display with the live value returned from the server
            if (typeof data.remaining === 'number') {
              setCountDisplay(data.remaining);
            }

            if (data.remaining <= 0) {
              freezeForge(forgeSubmitBtn);
            } else {
              forgeSubmitBtn.textContent = 'Received';
              forgeSubmitBtn.style.borderColor = 'var(--color-accent)';
              forgeSubmitBtn.style.color = 'var(--color-accent)';
            }
          } else {
            // Server-side rejection
            forgeSubmitBtn.disabled = false;
            forgeSubmitBtn.textContent = 'Submit';
            forgeSubmitBtn.style.borderColor = '';
            forgeSubmitBtn.style.color = '';
          }
        })
        .catch(function() {
          // Network error — re-enable
          forgeSubmitBtn.disabled = false;
          forgeSubmitBtn.textContent = 'Submit';
        });
    });
  }

  // Init forge if it's somehow the starting page
  initForge();


  // =============================================
  // SMOOTH SCROLL (for in-page anchors)
  // =============================================
  document.addEventListener('click', function(e) {
    var anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    var targetId = anchor.getAttribute('href');
    if (targetId === '#') return;
    var target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

})();
