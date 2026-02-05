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

    // Hover effects
    Array.prototype.slice.call(root.querySelectorAll('[data-hover-effect="true"]'))
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

  WFApp.global.initOnce = function initOnce() {
    if (didInit) return;
    didInit = true;

    ensureGlobals();
    initDecodeUI(document);
  };

  WFApp.global.afterEnter = function afterEnter(data) {
    ensureGlobals();

    // Re-bind behaviors inside the newly swapped container when possible
    var root = (data && data.next && data.next.container) ? data.next.container : document;
    initDecodeUI(root);

    if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
      try { window.ScrollTrigger.refresh(); } catch (_) {}
    }
  };

})();
