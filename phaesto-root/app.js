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
    // Quick spin animation
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
    // Highlight current page
    navPageLinks.forEach(function(link) {
      link.classList.toggle('active', link.dataset.page === currentPage);
    });
  }

  function closeNav() {
    navIsOpen = false;
    navOverlay.classList.remove('open');
    sigilTrigger.setAttribute('aria-expanded', 'false');
  }

  // Close nav on Escape
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
    // Close nav first
    closeNav();

    // Hide all pages
    var allPages = document.querySelectorAll('.page');
    allPages.forEach(function(p) {
      p.style.display = 'none';
      p.classList.remove('page-entering');
    });

    // Show target page
    var targetEl = document.getElementById('page-' + pageName);
    if (targetEl) {
      targetEl.style.display = '';
      // Small delay for transition to register
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          targetEl.classList.add('page-entering');
        });
      });
    }

    // Scroll to top
    window.scrollTo(0, 0);

    currentPage = pageName;

    // Re-init any page-specific JS
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
  // THE FORGE APPLICATION
  // =============================================
  var currentCount = 412;

  function initForge() {
    var forgeSubmitBtn = document.getElementById('forge-submit-btn');
    var forgeCount = document.getElementById('forge-count');

    if (!forgeSubmitBtn || forgeSubmitBtn._bound) return;
    forgeSubmitBtn._bound = true;

    forgeSubmitBtn.addEventListener('click', function() {
      var q1 = document.getElementById('forge-q1').value.trim();
      var q2 = document.getElementById('forge-q2').value.trim();

      if (q1 && q2) {
        forgeSubmitBtn.textContent = 'Received';
        forgeSubmitBtn.style.borderColor = 'var(--color-accent)';
        forgeSubmitBtn.style.color = 'var(--color-accent)';
        forgeSubmitBtn.disabled = true;
        hapticPulse();
        currentCount--;
        if (forgeCount) forgeCount.textContent = currentCount;
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
