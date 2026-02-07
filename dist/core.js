/*
  barba-dev core
  - Webflow-friendly (no bundler required)
  - Barba.js + optional GSAP transition hooks
  - Per-namespace controller mounting/unmounting

  Expected globals (loaded separately in Webflow):
  - barba (from @barba/core UMD)
  - gsap (optional)
  - ScrollTrigger (optional)
*/

(function () {
  'use strict';

  // ---- Configuration (edit as needed) ----

  var CONFIG = {
    debug: true,

    // Readiness gate: keep the transition overlay up until the new page signals it is ready.
    // Prevents gaps when scripts/CMS load late.
    readyTimeoutMs: 4000,
    // Optional extra hold after ready (helps align overlay reveal with page animations)
    revealDelayMs: 500,

    // jsDelivr base for page controllers.
    // If you prefer: set this from Webflow before loading core.js:
    // window.WFAPP_CDN_BASE = 'https://cdn.jsdelivr.net/gh/ncmgmt/barba-dev@main/dist/pages';
    cdnBase: (window.WFAPP_CDN_BASE || 'https://cdn.jsdelivr.net/gh/ncmgmt/barba-dev@main/dist/pages'),

    // Transition elements (existing Webflow structure)
    transitionWrapSelector: '.layout_transition_wrap',
    transitionColumnSelector: '.layout_column_el',
    logoWrapSelector: '.logo_wrap',
    fadeContainSelector: '[data-transition-contain="fade"]',
    contentWrapSelector: '.content_wrap',

    // Delay between leave-start and DOM swap (ms)
    transitionOffset: 0,

    // Namespaces that exist (for safety)
    namespaces: ['Home', 'Portfolio', 'Team', 'Insights', 'Contact', 'Imprint', 'Legal', 'PrivacyPolicy', 'Summit']
  };

  // ---- WFApp global registry ----

  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {}; // controllers register here
  WFApp._instances = WFApp._instances || {}; // namespace -> instance
  WFApp._loadedScripts = WFApp._loadedScripts || new Set();

  // ---- Page readiness gate ----
  // Controllers can call WFApp.ready.signal() when their DOM is in initial state and ready to animate.
  WFApp.ready = WFApp.ready || {};
  WFApp.ready._state = WFApp.ready._state || { token: 0, resolved: false, resolve: null, promise: null };
  // Expose current token for controllers to capture (avoid late signals resolving the wrong navigation).
  WFApp.ready.token = WFApp.ready._state.token || 0;

  function createReadyGate() {
    var s = WFApp.ready._state;
    s.token++;
    s.resolved = false;
    s.resolve = null;
    s.promise = new Promise(function (res) { s.resolve = res; });
    WFApp.ready.token = s.token;
    return { token: s.token, promise: s.promise };
  }

  // signal(token?): if token is provided, only resolves if it matches the current gate.
  WFApp.ready.signal = function signalReady(token) {
    try {
      var s = WFApp.ready._state;
      if (!s || s.resolved) return;
      if (typeof token === 'number' && isFinite(token) && token !== s.token) return;
      s.resolved = true;
      if (typeof s.resolve === 'function') s.resolve(true);
    } catch (_) {}
  };

  WFApp.loadCssOnce = function loadCssOnce(href) {
    if (!href) return Promise.resolve();
    WFApp._loadedCss = WFApp._loadedCss || new Set();
    var loaded = WFApp._loadedCss;
    var has = loaded instanceof Set ? loaded.has(href) : loaded[href];
    if (has) return Promise.resolve();
    if (loaded instanceof Set) loaded.add(href);
    else loaded[href] = true;

    return new Promise(function (resolve, reject) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = function () { resolve(); };
      l.onerror = function (e) { reject(e); };
      document.head.appendChild(l);
    });
  };

  WFApp.loadScriptOnce = function loadScriptOnce(src) {
    if (!src) return Promise.resolve();

    // Support both Set and plain object (in case of serialization)
    var loaded = WFApp._loadedScripts;
    var has = loaded instanceof Set ? loaded.has(src) : loaded[src];
    if (has) return Promise.resolve();

    if (loaded instanceof Set) loaded.add(src);
    else loaded[src] = true;

    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function (e) { reject(e); };
      document.head.appendChild(s);
    });
  };

  function log() {
    if (!CONFIG.debug) return;
    try { console.log.apply(console, arguments); } catch (_) {}
  }

  function warn() {
    try { console.warn.apply(console, arguments); } catch (_) {}
  }

  function assertBarba() {
    if (!window.barba) {
      throw new Error('barba is not available. Load @barba/core UMD before core.js');
    }
  }

  // ---- Transition helpers (GSAP columns + logo, like bw24) ----

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  // ---- Layout freeze helpers ----
  // Some navigations briefly produce a 0-height/unstable container during DOM swap,
  // which can show up as a tiny "gap" even if opacity/visibility is correct.
  // We freeze the wrapper height during transitions to keep layout stable.
  function freezeWrapperHeight(currentContainer) {
    try {
      var wrapper = document.querySelector('[data-barba="wrapper"]');
      if (!wrapper || !currentContainer) return;
      var r = currentContainer.getBoundingClientRect();
      if (!r || !isFinite(r.height) || r.height < 10) return;
      if (!WFApp._freezeState) WFApp._freezeState = {};
      if (WFApp._freezeState.active) return;
      WFApp._freezeState.active = true;
      WFApp._freezeState.prevMinHeight = wrapper.style.minHeight || '';
      wrapper.style.minHeight = Math.ceil(r.height) + 'px';
    } catch (_) {}
  }

  function unfreezeWrapperHeight() {
    try {
      var wrapper = document.querySelector('[data-barba="wrapper"]');
      if (!wrapper) return;
      var s = WFApp._freezeState || {};
      wrapper.style.minHeight = s.prevMinHeight || '';
      WFApp._freezeState = null;
    } catch (_) {}
  }

  // ---- Scroll lock (no layout reflow) ----
  // We must prevent scroll during transitions, but toggling overflow/position on <html>/<body>
  // caused brief reflow/blank gaps in this Webflow setup.
  // So we lock scrolling by canceling wheel/touch/keyboard scroll inputs.

  function lockBody() {
    try {
      if (WFApp._scrollLocked) return;
      WFApp._scrollLocked = true;

      var prevent = function (e) {
        try { e.preventDefault(); } catch (_) {}
        return false;
      };

      var onKey = function (e) {
        try {
          var k = e.key;
          // Block keys that scroll the page
          if (k === ' ' || k === 'Spacebar' || k === 'PageDown' || k === 'PageUp' || k === 'Home' || k === 'End' ||
              k === 'ArrowDown' || k === 'ArrowUp' || k === 'ArrowLeft' || k === 'ArrowRight') {
            e.preventDefault();
            return false;
          }
        } catch (_) {}
      };

      WFApp._scrollLockHandlers = { prevent: prevent, onKey: onKey };

      // Use capture + passive:false so preventDefault works reliably.
      document.addEventListener('wheel', prevent, { passive: false, capture: true });
      document.addEventListener('touchmove', prevent, { passive: false, capture: true });
      document.addEventListener('keydown', onKey, { passive: false, capture: true });
    } catch (_) {}
  }

  function unlockBody() {
    try {
      if (!WFApp._scrollLocked) return;
      WFApp._scrollLocked = false;
      var h = WFApp._scrollLockHandlers || {};
      document.removeEventListener('wheel', h.prevent, true);
      document.removeEventListener('touchmove', h.prevent, true);
      document.removeEventListener('keydown', h.onKey, true);
      WFApp._scrollLockHandlers = null;
    } catch (_) {}
  }

  function ensureTransitionVisible() {
    var wrap = qs(CONFIG.transitionWrapSelector);
    if (!wrap) return;
    // Keep in DOM and visible immediately.
    wrap.style.display = 'flex';
    // Avoid flicker from display toggles by using opacity.
    wrap.style.transition = 'opacity 120ms linear';
    wrap.style.opacity = '1';
  }

  function hideTransition() {
    var wrap = qs(CONFIG.transitionWrapSelector);
    if (!wrap) return;

    // Fade out instead of immediate display:none to avoid a 1-frame blank gap
    // during layout/paint after Barba swaps.
    try {
      wrap.style.transition = 'opacity 120ms linear';
      wrap.style.opacity = '0';
    } catch (_) {}

    // Remove from layout shortly after fade.
    setTimeout(function () {
      try { wrap.style.display = 'none'; } catch (_) {}
      try { wrap.style.opacity = '1'; } catch (_) {}
    }, 140);
  }

  function logoAnimationOnce() {
    return new Promise(function (resolve) {
      var logo = qs(CONFIG.logoWrapSelector);
      var svg = logo ? logo.querySelector('svg') : null;
      if (!logo || !svg || !window.gsap) return resolve();

      var hasAnimated = sessionStorage.getItem('logoAnimated') === 'true';

      logo.style.opacity = '1';
      logo.style.visibility = 'visible';

      if (hasAnimated) {
        window.gsap.set(logo, {
          clipPath: 'inset(0 0% 0 0)',
          opacity: 1,
          scale: 1,
          filter: 'none'
        });
        document.body.classList.remove('first-load');
        return resolve();
      }

      var paths = svg.querySelectorAll('path');
      paths.forEach(function (p) {
        p.style.opacity = '0';
        p.style.fill = 'transparent';
        p.style.stroke = 'currentColor';
      });

      var cursor = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      cursor.setAttribute('id', 'cursor-block');
      cursor.setAttribute('fill', 'currentColor');
      cursor.setAttribute('font-size', '26');
      cursor.setAttribute('font-family', 'monospace');
      cursor.textContent = '_';
      // Ensure required SVG attributes exist (prevents "Expected length, 'null'" errors)
      cursor.setAttribute('x', '0');
      cursor.setAttribute('y', '20');
      svg.appendChild(cursor);

      window.gsap.to(cursor, {
        opacity: 0.2,
        duration: 0.4,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      });

      var i = 0;
      var baseY = 20;

      function revealNextPath() {
        if (i >= paths.length) {
          try { cursor.remove(); } catch (_) {}
          document.body.classList.remove('first-load');
          sessionStorage.setItem('logoAnimated', 'true');
          return resolve();
        }

        var p = paths[i];
        var bbox = p.getBBox();

        window.gsap.to(cursor, {
          x: bbox.x + bbox.width + 4,
          y: baseY,
          duration: 0.05,
          ease: 'power1.inOut',
          onComplete: function () {
            // Keep SVG attributes in sync (Chrome can be strict about <text> x/y types)
            try { cursor.setAttribute('x', String(bbox.x + bbox.width + 4)); } catch (_) {}
            try { cursor.setAttribute('y', String(baseY)); } catch (_) {}
            window.gsap.to(p, {
              opacity: 1,
              fill: 'currentColor',
              duration: 0.12,
              ease: 'sine.out',
              onComplete: function () {
                i++;
                revealNextPath();
              }
            });
          }
        });
      }

      revealNextPath();
    });
  }

  function animateEnter(nextContainer) {
    // reset per-enter mid hook guard
    WFApp._enterMidFired = false;
    // Signal: reveal is starting now (overlay begins moving out)
    try { window.dispatchEvent(new CustomEvent('pageTransitionRevealStart')); } catch (_) {}
    // Transition out: columns move up, next container fades in
    return new Promise(function (resolve) {
      // Always target the incoming Barba container. Falling back to a global selector
      // can accidentally pick the outgoing page and makes the transition feel "decoupled".
      var transitionWrap = nextContainer;
      var pageTransition = qs(CONFIG.transitionWrapSelector);
      var cols = qsa(CONFIG.transitionColumnSelector);
      var fadeEl = qs(CONFIG.fadeContainSelector);

      if (!window.gsap || !pageTransition || !cols.length || !transitionWrap) {
        // Nothing to animate; caller finalizes overlay/unlock.
        return resolve();
      }

      lockBody();
      ensureTransitionVisible();

      // Prepare incoming container for fade-in UNDER the overlay.
      // We explicitly set opacity:0 first to avoid any flash.
      if (transitionWrap) window.gsap.set(transitionWrap, { opacity: 0, visibility: 'visible' });
      // Custom CSS sets [data-transition-contain='fade'] { opacity: 0 } by default.
      // Keep it visible during and after transitions to avoid a blank/gap.
      try { if (fadeEl) fadeEl.style.opacity = '1'; } catch (_) {}

      var tl = window.gsap.timeline({
        onComplete: function () {
          // Avoid a brief blank state: keep overlay up until the next container is actually visible.
          try {
            if (transitionWrap) {
              transitionWrap.style.opacity = '1';
              transitionWrap.style.visibility = 'visible';
            }

            var start = Date.now();
            (function waitVisible() {
              var ok = true;
              try {
                if (!transitionWrap) ok = true;
                else {
                  var cs = getComputedStyle(transitionWrap);
                  var op = parseFloat(cs.opacity);
                  var disp = cs.display;
                  var vis = cs.visibility;
                  var h = transitionWrap.getBoundingClientRect().height;
                  ok = !(disp === 'none' || vis === 'hidden' || (isFinite(op) && op <= 0.01) || h < 2);
                }
              } catch (_) {}

              if (ok || Date.now() - start > 800) {
                // Keep overlay visible until the caller finalizes the transition.
                resolve();
                return;
              }
              requestAnimationFrame(waitVisible);
            })();
            return;
          } catch (_) {
            // Keep overlay visible until the caller finalizes the transition.
            resolve();
          }
        }
      });

      // bw24 contract: fire pageTransitionCompleted mid-enter (under the overlay)
      // so page controllers can start setting/animating before the overlay is removed.
      if (!WFApp._enterMidFired) WFApp._enterMidFired = false;
      tl.call(function () {
        if (WFApp._enterMidFired) return;
        WFApp._enterMidFired = true;
        try { window.dispatchEvent(new CustomEvent('pageTransitionCompleted')); } catch (_) {}
        try { window.dispatchEvent(new CustomEvent('pageTransitionMidEnter')); } catch (_) {}
        // bw24 also forces a resize after enter to stabilize layout/ScrollTrigger.
        setTimeout(function () { try { window.dispatchEvent(new Event('resize')); } catch (_) {} }, 1500);
      }, null, 0.5);

      // Fade the new container in UNDER the overlay, so by the time columns clear,
      // content is already visible (prevents perceived "gap").
      tl.fromTo(transitionWrap,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.2,
          ease: 'linear',
          immediateRender: false,
          onStart: function () {
            if (fadeEl) fadeEl.style.opacity = '1';
          }
        },
        0.1
      )
        .to(cols, {
          y: '-100vh',
          duration: 1.25,
          ease: 'power4.inOut',
          stagger: { amount: 0.2, from: 'random' }
        }, '<');
    });
  }

  function animateLeave() {
    // Transition in: columns move from bottom to cover
    return new Promise(function (resolve) {
      var pageTransition = qs(CONFIG.transitionWrapSelector);
      var cols = qsa(CONFIG.transitionColumnSelector);
      if (!window.gsap || !pageTransition || !cols.length) return resolve();

      ensureTransitionVisible();
      lockBody();

      window.gsap.fromTo(cols, { y: '100vh' }, {
        y: '0vh',
        duration: 0.8,
        ease: 'power4.inOut',
        stagger: { amount: 0.15, from: 'random' },
        onComplete: function () {
          resolve();
        }
      });
    });
  }

  // ---- Controller lifecycle ----

  function getNamespace(data, which) {
    try {
      var ns = (which === 'next' ? data.next : data.current).namespace;
      return ns || null;
    } catch (_) {
      return null;
    }
  }

  function controllerUrlForNamespace(ns) {
    // Convention: pages/<Namespace>.js
    return CONFIG.cdnBase.replace(/\/$/, '') + '/' + encodeURIComponent(ns) + '.js';
  }

  async function mountNamespace(ns, container, data) {
    if (!ns) return;

    if (CONFIG.namespaces.indexOf(ns) === -1) {
      warn('[WFApp] Unknown namespace:', ns);
      // still try default if provided
    }

    var src = controllerUrlForNamespace(ns);
    await WFApp.loadScriptOnce(src);

    var controller = WFApp.pages[ns] || WFApp.pages.default;
    if (!controller || typeof controller.init !== 'function') {
      warn('[WFApp] No controller.init found for namespace:', ns, 'src:', src);
      return;
    }

    // Defensive: kill old instance for this namespace if any
    try {
      var old = WFApp._instances[ns];
      if (old && typeof old.destroy === 'function') old.destroy();
    } catch (_) {}

    var instance = controller.init({ container: container, namespace: ns, data: data });
    // Allow either returned instance with destroy, or controller itself with destroy
    WFApp._instances[ns] = instance && typeof instance === 'object' ? instance : controller;

    log('[WFApp] mounted', ns);
  }

  function unmountNamespace(ns) {
    if (!ns) return;
    var inst = WFApp._instances[ns];
    if (inst && typeof inst.destroy === 'function') {
      try { inst.destroy(); } catch (_) {}
    }
    delete WFApp._instances[ns];
    log('[WFApp] unmounted', ns);
  }

  function killScrollTriggersIn(rootEl) {
    if (!rootEl) return;
    if (!window.ScrollTrigger || typeof window.ScrollTrigger.getAll !== 'function') return;

    function isElement(x) { return x && x.nodeType === 1; }

    try {
      window.ScrollTrigger.getAll().forEach(function (t) {
        try {
          // Identify trigger element
          var trig = t && t.vars ? t.vars.trigger : null;
          var triggerEl = null;
          if (typeof trig === 'string') {
            triggerEl = rootEl.querySelector(trig);
          } else if (isElement(trig)) {
            triggerEl = trig;
          }

          // If we can't resolve trigger inside the outgoing container, skip.
          if (!triggerEl || !rootEl.contains(triggerEl)) return;

          // Extra safety: do NOT kill triggers whose animation targets live outside the outgoing container.
          // This prevents killing global nav/menu ScrollTriggers that may use a trigger selector inside the container.
          var anim = t.animation;
          if (anim && typeof anim.targets === 'function') {
            var targets = anim.targets() || [];
            for (var i = 0; i < targets.length; i++) {
              var target = targets[i];
              if (isElement(target) && !rootEl.contains(target)) {
                return; // keep this trigger
              }
            }
          }

          t.kill();
        } catch (_) {}
      });
    } catch (_) {}
  }

  function delay(ms) {
    return new Promise(function (r) { setTimeout(r, ms || 0); });
  }

  // Wait for at least two animation frames (double-rAF).
  // Useful to ensure DOM + Webflow IX2 initial states have been applied and painted
  // before we start revealing content.
  function waitForPaint() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          resolve();
        });
      });
    });
  }

  // ---- Webflow IX reinit (optional) ----
  function reinitWebflowIX2() {
    // Only if Webflow runtime exists
    var Webflow = window.Webflow;
    if (!Webflow) return;

    // Barba hooks can call this multiple times per navigation (once/beforeEnter/enter).
    // Webflow.destroy/ready/ix2.init is not idempotent and can re-apply initial states,
    // causing flicker + double animations. Throttle to at most once per tick.
    if (WFApp._ix2ReinitLock) return;
    WFApp._ix2ReinitLock = true;
    setTimeout(function () { WFApp._ix2ReinitLock = false; }, 0);

    try {
      Webflow.destroy();
      Webflow.ready();
      if (Webflow.require) {
        var ix2 = Webflow.require('ix2');
        if (ix2 && ix2.init) ix2.init();
      }
    } catch (e) {
      // Don’t hard fail; Webflow may not be present on some environments
      warn('[WFApp] Webflow reinit failed', e);
    }
  }

  // ---- Optional global hook file (dist/global.js) ----

  function tryInitGlobalOnce() {
    if (window.WFApp && window.WFApp.global && typeof window.WFApp.global.initOnce === 'function') {
      try { window.WFApp.global.initOnce(); } catch (_) {}
    }
  }

  function tryGlobalAfterEnter(data) {
    if (window.WFApp && window.WFApp.global && typeof window.WFApp.global.afterEnter === 'function') {
      try { window.WFApp.global.afterEnter(data); } catch (_) {}
    }
  }

  // ---- Barba init ----

  function init() {
    assertBarba();

    // Prevent double-initialization when core.js is included inside the Barba container.
    // Double init causes duplicate transitions and can spiral into recursive hook execution.
    if (WFApp._barbaInited) {
      log('[WFApp] core init skipped (already initialized)');
      return;
    }
    WFApp._barbaInited = true;

    // Global safety: always close the main menu around navigations.
    // (The menu toggle can ignore clicks while its GSAP timeline is active.)
    try {
      if (window.barba && window.barba.hooks) {
        window.barba.hooks.beforeLeave(function () {
          try {
            if (window.WFApp && window.WFApp.global && typeof window.WFApp.global.closeMenu === 'function') {
              window.WFApp.global.closeMenu({ immediate: false, forceAfterMs: 450 });
            }
          } catch (_) {}
        });
        window.barba.hooks.beforeEnter(function () {
          try {
            if (window.WFApp && window.WFApp.global && typeof window.WFApp.global.closeMenu === 'function') {
              window.WFApp.global.closeMenu({ immediate: false, forceAfterMs: 450 });
            }
          } catch (_) {}
        });
      }
    } catch (_) {}

    window.barba.init({
      debug: CONFIG.debug,
      timeout: 7000,
      // sync=false ensures we never reveal before the DOM swap is complete
      sync: false,
      transitions: [
        {
          name: 'default',
          async once(data) {
            tryInitGlobalOnce();

            // Create readiness gate for first load.
            var gate = createReadyGate();

            // On hard reload, Webflow may briefly paint content before IX2 applies initial states.
            // Keep the overlay up (it covers the swap). Avoid hiding the container with inline styles
            // because it can remain hidden after the overlay is removed on internal navigations.
            try {
              ensureTransitionVisible();
              lockBody();
            } catch (_) {}

            // Ensure correct first-load state
            var hasAnimated = sessionStorage.getItem('logoAnimated') === 'true';
            if (hasAnimated) document.body.classList.remove('first-load');

            // First load logo animation + enter transition
            await logoAnimationOnce();

            // Start mounting controller early but don't block the reveal.
            var ns = getNamespace(data, 'next');
            var mountPromise = mountNamespace(ns, data.next.container, data);

            // NOTE: no auto-signal fallback here.
            // Each page controller must explicitly call WFApp.ready.signal(token)
            // when it is actually ready to be revealed.

            // Let the swapped DOM paint before we animate reveal.
            await waitForPaint();
            // Make sure Webflow IX2 is initialized for this DOM before we reveal it.
            reinitWebflowIX2();
            // IX2 applies initial states asynchronously; wait for paint.
            await waitForPaint();

            // New hook: DOM swapped + IX2 ready, overlay still up.
            try { window.dispatchEvent(new CustomEvent('pageTransitionBeforeReveal')); } catch (_) {}

            // Wait until the page signals readiness (or timeout).
            try {
              var gate = WFApp.ready && WFApp.ready._state ? WFApp.ready._state : null;
              var p = gate && gate.promise ? gate.promise : Promise.resolve(true);
              await Promise.race([p, delay(CONFIG.readyTimeoutMs)]);
            } catch (_) {}

            try { if (CONFIG.revealDelayMs) await delay(CONFIG.revealDelayMs); } catch (_) {}

            await animateEnter(data.next && data.next.container);

            // Ensure controller is mounted before firing post-reveal hook.
            await mountPromise;
            // Post-reveal hook (new). pageTransitionCompleted fires mid-enter like bw24.
            try { window.dispatchEvent(new CustomEvent('pageTransitionAfterReveal')); } catch (_) {}

            // Ensure final visibility
            try {
              if (data && data.next && data.next.container) {
                // Do NOT clear to '' (Webflow/IX2 can have default hidden states).
                // Force final visible state after transition.
                data.next.container.style.opacity = '1';
                data.next.container.style.visibility = 'visible';
              }
            } catch (_) {}

            // Do NOT hide the overlay here.
            // We'll finalize (hide overlay + unlock body) in the global `after` hook,
            // because the live container can still be style-hidden until Barba completes the swap.
          },
          async leave(data) {
            // Close menu overlays before navigating (prevents visual flash + wrong layering)
            try {
              if (window.WFApp && window.WFApp.global && typeof window.WFApp.global.closeMenu === 'function') {
                window.WFApp.global.closeMenu({ immediate: false, forceAfterMs: 450 });
              }
            } catch (_) {}

            // Make sure the transition overlay is visible as early as possible.
            // If we hide the current container before the overlay is painted, users can see a brief blank gap.
            try {
              ensureTransitionVisible();
              var wrap = qs(CONFIG.transitionWrapSelector);
              if (wrap) {
                wrap.style.opacity = '1';
                wrap.style.visibility = 'visible';
              }
            } catch (_) {}

            // IMPORTANT: scroll reset must happen while the overlay covers the page.
            // Doing it in `after` causes a visible jump/gap (especially when navigating from footer).
            try { window.scrollTo(0, 0); } catch (_) {}

            // Freeze layout to avoid a brief 0-height wrapper/container during DOM swap.
            try { freezeWrapperHeight(data && data.current && data.current.container); } catch (_) {}

            // Kill only ScrollTriggers that belong to the outgoing container.
            try { killScrollTriggersIn(data && data.current && data.current.container); } catch (_) {}
            unmountNamespace(getNamespace(data, 'current'));

            // Play leave animation BEFORE we swap content
            await animateLeave();

            // Now that the overlay fully covers the screen, hide the outgoing container.
            // This prevents the old page from bleeding through during the reveal of the next page.
            try {
              if (data && data.current && data.current.container) {
                data.current.container.style.opacity = '0';
                data.current.container.style.visibility = 'hidden';
              }
            } catch (_) {}

            if (CONFIG.transitionOffset) await delay(CONFIG.transitionOffset);
          },
          async beforeEnter(data) {
            // Create a fresh readiness gate for this navigation.
            var gate = createReadyGate();

            // Do not hide the incoming container here.
            // The overlay covers the swap; hiding here can create a visible gap if something delays unhide.

            // Re-init Webflow interactions BEFORE revealing the new container.
            // This can take a few hundred ms; we keep the transition overlay up during this time.
            reinitWebflowIX2();
          },
          async enter(data) {
            // Start mounting controller early but don't block the reveal.
            var ns = getNamespace(data, 'next');
            var mountPromise = mountNamespace(ns, data.next.container, data);

            // NOTE: no auto-signal fallback here.
            // Each page controller must explicitly call WFApp.ready.signal(token)
            // when it is actually ready to be revealed.

            // Let the swapped DOM paint before we animate reveal.
            await waitForPaint();

            // New hook: DOM swapped + IX2 ready, overlay still up.
            try { window.dispatchEvent(new CustomEvent('pageTransitionBeforeReveal')); } catch (_) {}

            // Wait until the page signals readiness (or timeout).
            try {
              var gate = WFApp.ready && WFApp.ready._state ? WFApp.ready._state : null;
              var p = gate && gate.promise ? gate.promise : Promise.resolve(true);
              await Promise.race([p, delay(CONFIG.readyTimeoutMs)]);
            } catch (_) {}

            // Optional extra hold (fine-tune perceived alignment)
            try { if (CONFIG.revealDelayMs) await delay(CONFIG.revealDelayMs); } catch (_) {}

            // Start reveal animation (overlay out + container fade).
            await animateEnter(data.next && data.next.container);

            // Ensure controller is mounted before firing post-reveal hook.
            await mountPromise;
            // Post-reveal hook (new). pageTransitionCompleted fires mid-enter like bw24.
            try { window.dispatchEvent(new CustomEvent('pageTransitionAfterReveal')); } catch (_) {}

            // Ensure final visibility (beforeEnter set it hidden to avoid IX2 flicker)
            try {
              if (data && data.next && data.next.container) {
                data.next.container.style.opacity = '1';
                data.next.container.style.visibility = 'visible';
              }
            } catch (_) {}

            // Do NOT hide the overlay here.
            // We'll finalize (hide overlay + unlock body) in the global `after` hook,
            // because the live container can still be style-hidden until Barba completes the swap.
          },
          async after(data) {
            // At this point Barba has completed the swap; the live container is stable.
            // Ensure it is visible (some pages/IX2 can leave inline hidden styles briefly).
            try {
              var live = document.querySelector('[data-barba="container"]');
              if (live) {
                live.style.opacity = '1';
                live.style.visibility = 'visible';
                if (!live.style.display) live.style.display = 'block';
              }
            } catch (_) {}

            // Let the browser paint the new page before removing the overlay.
            try { await waitForPaint(); } catch (_) {}

            // Finalize transition.
            // IMPORTANT: unlocking scroll (changing overflow styles) can cause a brief reflow/blank gap.
            // So we hide the overlay first, let the browser paint the new page, then unlock.
            try { hideTransition(); } catch (_) {}
            try { await waitForPaint(); } catch (_) {}
            try { await waitForPaint(); } catch (_) {}
            try { setTimeout(function () { try { unlockBody(); } catch (_) {} }, 150); } catch (_) { try { unlockBody(); } catch (_) {} }

            if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
              try { window.ScrollTrigger.refresh(); } catch (_) {}
            }

            tryGlobalAfterEnter(data);

            // Unfreeze layout after the swap is complete.
            try { unfreezeWrapperHeight(); } catch (_) {}
          }
        }
      ]
    });

    // Better scroll handling with SPA-like navigation
    try { history.scrollRestoration = 'manual'; } catch (_) {}

    log('[WFApp] core initialized');
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
