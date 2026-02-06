/*
  Global (persistent) behaviors for Webflow + Barba.

  Keep this file small and truly global.
  Page-specific code belongs in dist/pages/<Namespace>.js.

  This file fixes a common Barba/Webflow issue:
  - scripts that were previously tied to DOMContentLoaded must be re-run after Barba swaps.

  Responsibilities here:
  - provide shared helpers (decodeEffect / randomCharacter*)
  - re-bind hover/click effects + reveal-on-load effects after every Barba enter
*/

(function () {
  'use strict';

  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.global = WFApp.global || {};

  var didInit = false;

  // ---- Shared helpers (ported from bw24/global-decode_animate.js) ----

  function randomCharacterDate() {
    var chars = '/()?[]0123456789';
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }

  function randomCharacterTag() {
    var chars = 'ABCKLOWXabcdefghijklmnopqrstuvwxyz';
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }

  function randomCharacterDigital() {
    var chars = '01ABCDEFHKMNPRSTUVWXYZ';
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }

  function decodeEffect(
    el,
    randomCharFunc,
    duration,
    useBlocks,
    direction,
    animateReveal,
    charDuration,
    speedChangeFactor,
    maxAnimationDuration
  ) {
    if (!el) return;

    // Defaults
    if (useBlocks === undefined) useBlocks = true;
    if (!direction) direction = 'forward';
    if (animateReveal === undefined) animateReveal = false;
    if (!speedChangeFactor) speedChangeFactor = 1.1;
    if (!maxAnimationDuration) maxAnimationDuration = 1500;

    // Allow newer animations to cancel older ones
    el.__bwDecodeToken = (el.__bwDecodeToken || 0) + 1;
    var token = el.__bwDecodeToken;
    el.dataset.animating = 'true';

    var originalText = el.dataset.originalText || el.textContent || '';
    el.dataset.originalText = originalText;

    if (animateReveal || !el.querySelector('.char-box')) {
      el.innerHTML = '';

      for (var i = 0; i < originalText.length; i++) {
        var ch = originalText[i];

        var charBox = document.createElement('span');
        charBox.className = 'char-box';

        var charSpan = document.createElement('span');
        charSpan.className = 'char';
        charSpan.innerHTML = animateReveal ? '' : (ch === ' ' ? '&nbsp;' : ch);

        if (useBlocks) {
          var bgBox = document.createElement('span');
          bgBox.className = 'bg-box';
          bgBox.style.opacity = '0';
          charBox.appendChild(bgBox);
        }

        charBox.appendChild(charSpan);
        el.appendChild(charBox);
      }
    }

    var charBoxes = Array.prototype.slice.call(el.children);

    el.style.display = 'inline-block';
    if (animateReveal) {
      charBoxes.forEach(function (box) { box.style.opacity = '0'; });
    }

    var perChar = maxAnimationDuration
      ? (maxAnimationDuration / Math.max(1, charBoxes.length))
      : (charDuration || duration / Math.max(1, charBoxes.length));

    function updateCharBox(index, speedFactor) {
      if (token !== el.__bwDecodeToken) return; // cancelled

      if (index >= charBoxes.length || index < 0) {
        el.dataset.animating = 'false';
        return;
      }

      var charBox = charBoxes[index];
      var charSpan = charBox.querySelector('.char');

      if (useBlocks) {
        var bg = charBox.querySelector('.bg-box');
        if (bg) bg.style.opacity = '1';
      }

      var effectiveCharDuration = perChar / speedFactor;
      var startTime = performance.now();
      var tickMs = Math.max(12, Math.min(28, effectiveCharDuration / 2));
      var lastTick = startTime;

      // Make the first tick immediate
      try { charSpan.textContent = randomCharFunc(); } catch (_) {}
      if (animateReveal) charBox.style.opacity = '1';

      function update(now) {
        if (token !== el.__bwDecodeToken) return;

        var elapsed = now - startTime;
        var progress = Math.min(elapsed / effectiveCharDuration, 1);

        if (progress < 1) {
          if (now - lastTick >= tickMs) {
            lastTick = now;
            try { charSpan.textContent = randomCharFunc(); } catch (_) {}
          }
          if (animateReveal && charBox.style.opacity !== '1') charBox.style.opacity = '1';
          requestAnimationFrame(update);
          return;
        }

        var pauseMs = Math.min(60, Math.max(20, effectiveCharDuration * 0.15));
        setTimeout(function () {
          if (token !== el.__bwDecodeToken) return;

          var finalChar = originalText[index];
          charSpan.innerHTML = finalChar === ' ' ? '&nbsp;' : finalChar;

          if (useBlocks) {
            var bg2 = charBox.querySelector('.bg-box');
            if (bg2) bg2.style.opacity = '0';
          }

          updateCharBox(direction === 'reverse' ? index - 1 : index + 1, speedFactor * speedChangeFactor);
        }, pauseMs);
      }

      requestAnimationFrame(update);
    }

    updateCharBox(direction === 'reverse' ? charBoxes.length - 1 : 0, 1);
  }

  function setInitialWidth(el) {
    var originalText = el.dataset.originalText || el.textContent || '';
    var tmp = document.createElement('span');
    tmp.style.visibility = 'hidden';
    tmp.style.position = 'absolute';
    tmp.style.whiteSpace = 'nowrap';
    tmp.innerHTML = originalText.replace(/ /g, '&nbsp;');
    document.body.appendChild(tmp);
    var w = tmp.offsetWidth;
    tmp.remove();
    el.style.width = w + 'px';
  }

  function applyHoverEffect(el) {
    if (!el || el.dataset.animating === 'true') return;
    el.dataset.animating = 'true';

    var direction = el.dataset.direction || 'forward';
    var duration = 1700;
    var rand = window.randomCharacterDigital || window.randomCharacterTag || randomCharacterDigital;

    decodeEffect(el, rand, duration, el.dataset.useBlocks !== 'false', direction, false);

    setTimeout(function () {
      el.dataset.animating = '';
    }, duration);
  }

  function addHoverAndClickEffect(el) {
    if (!(el instanceof Element)) return;
    if (el.dataset.hoverEffectBound === 'true') return;
    el.dataset.hoverEffectBound = 'true';

    try { setInitialWidth(el); } catch (_) {}

    el.addEventListener('mouseenter', function () { applyHoverEffect(el); });

    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      el.addEventListener('click', function () { applyHoverEffect(el); });
    }
  }

  function applyPageLoadAnimation(el) {
    if (!el || el.dataset.revealAnimated === 'true') return;
    el.dataset.revealAnimated = 'true';

    var direction = el.dataset.direction || 'forward';
    var duration = 1700;
    var rand = window.randomCharacterDigital || window.randomCharacterTag || randomCharacterDigital;

    el.style.opacity = '0';
    el.style.visibility = 'hidden';

    setTimeout(function () {
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      decodeEffect(el, rand, duration, el.dataset.useBlocks !== 'false', direction, true);
    }, 100);
  }

  function initDecodeUI(root) {
    root = root || document;

    // Hover effects (bw24 uses data-animate-hover; keep both)
    Array.prototype.slice.call(root.querySelectorAll('[data-hover-effect="true"], [data-animate-hover="true"]'))
      .forEach(addHoverAndClickEffect);

    // Reveal-on-load
    Array.prototype.slice.call(root.querySelectorAll('[data-animate-reveal="true"]'))
      .forEach(applyPageLoadAnimation);

    // Button animation hooks (if any use [data-btn-animate])
    Array.prototype.slice.call(root.querySelectorAll('[data-btn-animate]')).forEach(function (btn) {
      // no-op placeholder; keep compatibility if needed later
      // (bw24 had button-specific wrappers; we can port them when needed)
      void btn;
    });
  }

  // Expose globals once
  function ensureGlobals() {
    if (!window.randomCharacterDate) window.randomCharacterDate = randomCharacterDate;
    if (!window.randomCharacterTag) window.randomCharacterTag = randomCharacterTag;
    if (!window.randomCharacterDigital) window.randomCharacterDigital = randomCharacterDigital;
    if (!window.decodeEffect) window.decodeEffect = decodeEffect;
    if (!window.addHoverAndClickEffect) window.addHoverAndClickEffect = addHoverAndClickEffect;
    if (!window.hoverEffect) window.hoverEffect = applyHoverEffect;
  }

  // ---- Public hooks for core.js ----

  // Allow page controllers / CMS loaders to re-bind hover/reveal behaviors
  WFApp.global.rebind = function rebind(root) {
    ensureGlobals();
    initDecodeUI(root || document);
  };

  // ---- Blocks background (ported from bw24/blocks.js) ----

  function bwCreateBlocksForContainer(container) {
    if (!container || !window.gsap || !window.ScrollTrigger) return;

    var reverse = container.getAttribute('data-mirror-vertical') === 'true';
    var mirrorHorizontal = container.getAttribute('data-mirror-horizontal') === 'true';

    var blockSizeRem = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--block--size'));
    var rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    var blockSize = blockSizeRem * rootFontSize;

    var containerWidth = container.clientWidth;
    var containerHeight = container.clientHeight;
    var numCols = Math.floor(containerWidth / blockSize);
    var numRows = Math.floor(containerHeight / blockSize);
    var numBlocks = numCols * numRows;

    if (!numCols || !numRows || !numBlocks) return;

    var opacityLevels = [0.2, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85];

    var blockStartSpace = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--block--start-space'));
    var startOffset = Math.max(0, Math.floor(blockStartSpace * rootFontSize) / (blockSize * numCols));

    function calculateOpacity(row, col, adjustedCol, adjustedRow, numRows2, numCols2) {
      var focusStartCol = numCols2 * 0.575;
      var focusEndCol = numCols2 * 0.001;
      var focusStartRow = numRows2 * 0.85;
      var focusEndRow = numRows2 * 0.001;

      var opacity = 0;

      if (col < focusStartCol || col > focusEndCol || row < focusStartRow || row > focusEndRow) {
        opacity = opacityLevels[Math.floor(Math.random() * 4)];
      } else {
        var randomIndex = 3 + Math.floor(Math.random() * (opacityLevels.length - 4));
        opacity = opacityLevels[randomIndex];
      }

      var fadeOutIntensity = 0.25 + 2.4 * (Math.min(row / numRows2, 2 - row / numRows2) * Math.min(col / numCols2, 10 - col / numCols2));
      opacity *= fadeOutIntensity;

      // soft-edge zeros
      var zeroOpacityStartCol = 0;
      var zeroOpacityEndCol = numCols2 * Math.random() + 0.175;
      var zeroOpacityStartRow = 0;
      var zeroOpacityEndRow = numRows2 * Math.random() - 0.325;

      if (col >= zeroOpacityStartCol && col <= zeroOpacityEndCol && row >= zeroOpacityStartRow && row <= zeroOpacityEndRow) {
        var distanceFromEdge = Math.min(
          adjustedCol - zeroOpacityStartCol,
          zeroOpacityEndCol - adjustedCol * (adjustedCol / numCols2)
        ) / (zeroOpacityEndCol - zeroOpacityStartCol);
        var softEdgeFactor = Math.max(0, 1 - distanceFromEdge * 0.2575);
        if (Math.random() < softEdgeFactor) opacity = 0;
      }

      return opacity;
    }

    function shuffleArray(array) {
      for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
      }
      return array;
    }

    // rebuild
    container.innerHTML = '';

    var blocks = [];
    for (var i = 0; i < numBlocks; i++) {
      var block = document.createElement('div');
      block.classList.add('block');
      block.dataset.index = String(i);

      var row = Math.floor(i / numCols);
      var col = i % numCols;

      if (reverse) row = numRows - 1 - row;
      if (mirrorHorizontal) col = numCols - 1 - col;

      var adjustedCol = col - startOffset;
      var adjustedRow = row - startOffset;

      var opacity = calculateOpacity(row, col, adjustedCol, adjustedRow, numRows, numCols);
      block.dataset.targetOpacity = opacity.toFixed(2);
      block.style.opacity = '0';
      block.style.left = (col * blockSize) + 'px';
      block.style.top = (row * blockSize) + 'px';

      blocks.push(block);
      container.appendChild(block);
    }

    function animateBlocks() {
      var shuffled = shuffleArray(blocks.slice());
      shuffled.forEach(function (block, idx) {
        var targetOpacity = parseFloat(block.dataset.targetOpacity);
        window.gsap.to(block, {
          autoAlpha: targetOpacity,
          duration: 0.2,
          delay: idx * 0.01,
          ease: 'power1.out'
        });
      });
    }

    // ---- pointer hover highlight (ported from bw24/blocks.js; delegated per container) ----
    var highlightTimeouts = container.__bwBlockHighlightTimeouts || new WeakMap();
    container.__bwBlockHighlightTimeouts = highlightTimeouts;

    function flashHighlight(el) {
      if (!el) return;
      el.classList.add('block_highlight');
      var existing = highlightTimeouts.get(el);
      if (existing) clearTimeout(existing);
      highlightTimeouts.set(el, setTimeout(function () {
        el.classList.remove('block_highlight');
      }, 500));
    }

    function highlightRandomAtIndex(index, prevIndex) {
      flashHighlight(container.children[index]);

      var col0 = index % numCols;
      var row0 = Math.floor(index / numCols);

      var dx = 0;
      var dy = 0;
      if (typeof prevIndex === 'number' && isFinite(prevIndex)) {
        dx = col0 - (prevIndex % numCols);
        dy = row0 - Math.floor(prevIndex / numCols);
      }

      var sx = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
      var sy = dy === 0 ? 0 : (dy > 0 ? 1 : -1);

      var candidates = [];
      if (sx || sy) candidates.push(index + sx + sy * numCols);
      if (sx) candidates.push(index + sx);
      if (sy) candidates.push(index + sy * numCols);

      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          candidates.push(index + dc + dr * numCols);
        }
      }

      var seen = new Set();
      for (var k = 0; k < candidates.length; k++) {
        var nIndex = candidates[k];
        if (seen.has(nIndex)) continue;
        seen.add(nIndex);
        if (nIndex < 0 || nIndex >= numBlocks) continue;
        if (Math.abs((nIndex % numCols) - col0) > 1) continue;
        flashHighlight(container.children[nIndex]);
        break;
      }
    }

    container.__bwBlocksMeta = { numCols: numCols, numRows: numRows, numBlocks: numBlocks };
    container.__bwHighlightAtIndex = highlightRandomAtIndex;

    if (!container.__bwBlocksPointerBound) {
      container.__bwBlocksPointerBound = true;
      var lastIndex = -1;
      var pendingIndex = -1;
      var rafId2 = 0;

      container.addEventListener('pointermove', function (e) {
        var blockEl = e.target && e.target.closest ? e.target.closest('.block') : null;
        if (!blockEl) return;
        var idx2 = Number(blockEl.dataset.index);
        if (!isFinite(idx2) || idx2 === lastIndex) return;

        pendingIndex = idx2;
        if (rafId2) return;
        rafId2 = requestAnimationFrame(function () {
          rafId2 = 0;
          var nextIndex = pendingIndex;
          pendingIndex = -1;
          var prev = lastIndex;
          lastIndex = nextIndex;
          var fn = container.__bwHighlightAtIndex;
          if (typeof fn === 'function') fn(nextIndex, prev);
        });
      }, { passive: true });
    }

    // kill previous trigger if any
    if (container.__bwBlocksST) {
      try { container.__bwBlocksST.kill(); } catch (_) {}
      container.__bwBlocksST = null;
    }

    container.__bwBlocksST = window.ScrollTrigger.create({
      trigger: container,
      start: 'top bottom',
      onEnter: function () { animateBlocks(); }
    });

    // initial animate if already in view
    try {
      if (container.getBoundingClientRect().top < window.innerHeight) animateBlocks();
    } catch (_) {}
  }

  function bwEnsureBlocksReady(container) {
    if (!container) return;

    // If container has no size yet on first paint (common on Webflow/IX2), wait for it.
    if ((container.clientWidth || 0) > 0 && (container.clientHeight || 0) > 0) {
      bwCreateBlocksForContainer(container);
      return;
    }

    if (container.__bwBlocksRO) return;

    try {
      var ro = new ResizeObserver(function () {
        if ((container.clientWidth || 0) > 0 && (container.clientHeight || 0) > 0) {
          try { bwCreateBlocksForContainer(container); } catch (_) {}
          try { ro.disconnect(); } catch (_) {}
          container.__bwBlocksRO = null;
        }
      });
      ro.observe(container);
      container.__bwBlocksRO = ro;
    } catch (_) {
      // Fallback: poll a few times
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        if ((container.clientWidth || 0) > 0 && (container.clientHeight || 0) > 0) {
          clearInterval(t);
          try { bwCreateBlocksForContainer(container); } catch (_) {}
        }
        if (tries > 30) clearInterval(t);
      }, 100);
    }
  }

  function bwCreateBlocksAll() {
    // If deps are not ready yet (first-load race), retry for a short window.
    if (!window.gsap || !window.ScrollTrigger) {
      var state = WFApp._bwBlocksRetry || (WFApp._bwBlocksRetry = { tries: 0, timer: null });
      if (state.timer) return;
      state.timer = setInterval(function () {
        state.tries++;
        if (window.gsap && window.ScrollTrigger) {
          clearInterval(state.timer);
          state.timer = null;
          bwCreateBlocksAll();
        }
        if (state.tries > 30) {
          clearInterval(state.timer);
          state.timer = null;
        }
      }, 100);
      return;
    }

    var containers = document.querySelectorAll('[data-background="true"]');
    containers.forEach(function (c) {
      bwEnsureBlocksReady(c);
    });
  }

  var _bwPrevWindowWidth = window.innerWidth;
  var _bwResizeRaf = 0;
  function bwInstallBlocksOnce() {
    if (WFApp._blocksInstalled) return;
    WFApp._blocksInstalled = true;

    window.addEventListener('resize', function () {
      var w = window.innerWidth;
      if (w === _bwPrevWindowWidth) return;
      if (_bwResizeRaf) cancelAnimationFrame(_bwResizeRaf);
      _bwResizeRaf = requestAnimationFrame(function () {
        bwCreateBlocksAll();
        _bwPrevWindowWidth = w;
      });
    });
  }

  // ---- Menu helpers ----
  // We keep gsap_menu.js as an external global include for now.
  // Under Barba we must ensure it closes before navigation.
  //
  // NOTE: The gsap_menu toggle ignores clicks while its GSAP timeline is active.
  // During fast clicks + Barba navigation this means a naive "click the toggle" close
  // can be dropped and the menu stays open across pages.
  //
  // closeMenu({ immediate: true }) force-hides the menu by resetting classes/styles.
  WFApp.global.closeMenu = function closeMenu(opts) {
    opts = opts || {};
    var immediate = !!opts.immediate;

    // Try the normal close path first (plays the reverse animation when possible)
    var openBtn = document.querySelector('.nav_icon_wrap.nav-open');
    if (openBtn && !immediate) {
      try { openBtn.click(); return; } catch (_) {}
    }

    // Fallback: force-close (used for Barba leave hooks / capture-phase link clicks)
    try {
      Array.prototype.slice.call(document.querySelectorAll('.nav_icon_wrap.nav-open'))
        .forEach(function (el) { try { el.classList.remove('nav-open'); } catch (_) {} });

      // Hide menu overlay/wrap (these are global nav elements, not inside Barba containers)
      Array.prototype.slice.call(document.querySelectorAll('.layout_menu_wrap'))
        .forEach(function (el) { try { el.style.display = 'none'; } catch (_) {} });

      // Best-effort: restore pointer events if the menu script enabled them
      Array.prototype.slice.call(document.querySelectorAll('.layout_nav_wrap'))
        .forEach(function (el) { try { el.style.pointerEvents = ''; } catch (_) {} });

      // Optional: clear any body locking used by other menu implementations
      try { document.body.style.overflow = ''; } catch (_) {}
      try { document.body.style.position = ''; } catch (_) {}
      try { document.body.style.width = ''; } catch (_) {}
    } catch (_) {}
  };

  // Close menu eagerly when clicking internal links inside the menu.
  // Use capture phase so it runs before Barba/Webflow handlers.
  function isProbablyInternalLink(a) {
    if (!a || !a.getAttribute) return false;
    var href = a.getAttribute('href') || '';
    if (!href || href === '#' || href.indexOf('#') === 0) return false;
    if (/^(mailto:|tel:|sms:|javascript:)/i.test(href)) return false;
    if (a.hasAttribute('download')) return false;
    var target = (a.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return false;

    try {
      var url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return false;
      return true;
    } catch (_) {
      // If URL parsing fails, assume relative links are internal
      return href.indexOf('http') !== 0;
    }
  }

  function installMenuLinkCloseOnce() {
    if (WFApp._menuLinkCloseInstalled) return;
    WFApp._menuLinkCloseInstalled = true;

    document.addEventListener('click', function (e) {
      // Ignore modified clicks (new tab, etc.)
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var t = e.target;
      var a = t && t.closest ? t.closest('a') : null;
      if (!a) return;

      // Only for clicks inside the menu UI
      var inMenu = false;
      try {
        inMenu = !!(a.closest && (a.closest('.layout_menu_wrap') || a.closest('.nav_menu_contain') || a.closest('.nav_menu_base')));
      } catch (_) {}
      if (!inMenu) return;

      if (!isProbablyInternalLink(a)) return;

      // Force-close so we don't depend on the menu timeline accepting the click.
      try { WFApp.global.closeMenu({ immediate: true }); } catch (_) {}
    }, true);
  }

  WFApp.global.initOnce = function initOnce() {
    if (didInit) return;
    didInit = true;

    ensureGlobals();
    initDecodeUI(document);

    // blocks background
    bwInstallBlocksOnce();
    bwCreateBlocksAll();

    // menu: close on internal link clicks inside the menu (capture-phase)
    installMenuLinkCloseOnce();

    // Ensure triggers evaluate immediately on first load (prevents blocks staying at opacity 0 until navigation)
    try { if (window.ScrollTrigger && window.ScrollTrigger.refresh) window.ScrollTrigger.refresh(true); } catch (_) {}
  };

  WFApp.global.afterEnter = function afterEnter(data) {
    ensureGlobals();

    // Re-bind behaviors inside the newly swapped container when possible
    var root = (data && data.next && data.next.container) ? data.next.container : document;
    initDecodeUI(root);

    // blocks background might live inside the swapped container
    bwCreateBlocksAll();

    if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
      try { window.ScrollTrigger.refresh(true); } catch (_) {}
    }
  };

})();
