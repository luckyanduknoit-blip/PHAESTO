/* =========================================
   PHAĒSTO ATELIER — THE DIGITAL CHAPEL
   Multi-page SPA: Ghost, Sigil Nav, Pages
   ========================================= */

(function() {
  'use strict';

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
  // THE FORGE APPLICATION — LIVE PERSISTENT COUNTER
  // Powered by Supabase Edge Function
  // =============================================
  var FORGE_API = 'https://txepvzhmllhxpqeboodi.supabase.co/functions/v1/forge-counter';
  var FORGE_SUBMIT_API = '/api/forge';

  function fetchForgeCount(callback) {
    fetch(FORGE_API, { method: 'GET' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        callback(typeof data.remaining === 'number' ? data.remaining : null);
      })
      .catch(function() { callback(null); });
  }

  function decrementForgeCount(callback) {
    fetch(FORGE_API, { method: 'POST' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        callback(typeof data.remaining === 'number' ? data.remaining : null);
      })
      .catch(function() { callback(null); });
  }

  function saveForgeApplicant(devotion, contact, callback) {
    fetch(FORGE_SUBMIT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ devotion: devotion, contact: contact })
    })
      .then(function(r) { return r.json(); })
      .then(function(data) { callback(data.success === true, null); })
      .catch(function(err) { callback(false, err); });
  }

  function initForge() {
    var forgeSubmitBtn = document.getElementById('forge-submit-btn');
    var forgeCount = document.getElementById('forge-count');

    // Fetch live count every time forge page is opened
    if (forgeCount) {
      forgeCount.textContent = '\u2026';
      fetchForgeCount(function(remaining) {
        if (remaining !== null) forgeCount.textContent = remaining;
      });
    }

    if (!forgeSubmitBtn || forgeSubmitBtn._bound) return;
    forgeSubmitBtn._bound = true;

    forgeSubmitBtn.addEventListener('click', function() {
      var q1 = document.getElementById('forge-q1').value.trim();
      var q2 = document.getElementById('forge-q2').value.trim();

      if (q1 && q2) {
        forgeSubmitBtn.textContent = 'Sending\u2026';
        forgeSubmitBtn.disabled = true;

        saveForgeApplicant(q1, q2, function(success) {
          if (success) {
            forgeSubmitBtn.textContent = 'Received';
            forgeSubmitBtn.style.borderColor = 'var(--color-accent)';
            forgeSubmitBtn.style.color = 'var(--color-accent)';
            hapticPulse();
            decrementForgeCount(function(remaining) {
              if (forgeCount && remaining !== null) forgeCount.textContent = remaining;
            });
          } else {
            forgeSubmitBtn.textContent = 'Error — Try Again';
            forgeSubmitBtn.style.borderColor = '#8B4513';
            forgeSubmitBtn.disabled = false;
            setTimeout(function() {
              forgeSubmitBtn.textContent = 'Submit';
              forgeSubmitBtn.style.borderColor = '';
            }, 3000);
          }
        });
      } else {
        forgeSubmitBtn.textContent = 'Incomplete';
        forgeSubmitBtn.style.borderColor = '#8B4513';
        setTimeout(function() {
          forgeSubmitBtn.textContent = 'Submit';
          forgeSubmitBtn.style.borderColor = '';
        }, 2000);
      }
    });
  }

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
