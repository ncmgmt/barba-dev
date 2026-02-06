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

  function lockBody() {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }

  function unlockBody() {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }

  function ensureTransitionVisible() {
    var wrap = qs(CONFIG.transitionWrapSelector);
    if (wrap) wrap.style.display = 'flex';
  }

  function hideTransition() {
    var wrap = qs(CONFIG.transitionWrapSelector);
    if (wrap) wrap.style.display = 'none';
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
    // Transition out: columns move up, next container fades in
    return new Promise(function (resolve) {
      var transitionWrap = nextContainer || qs(CONFIG.contentWrapSelector);
      var pageTransition = qs(CONFIG.transitionWrapSelector);
      var cols = qsa(CONFIG.transitionColumnSelector);
      var fadeEl = qs(CONFIG.fadeContainSelector);

      if (!window.gsap || !pageTransition || !cols.length) {
        hideTransition();
        unlockBody();
        return resolve();
      }

      lockBody();
      ensureTransitionVisible();

      if (transitionWrap) window.gsap.set(transitionWrap, { opacity: 1, visibility: 'visible' });

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
                hideTransition();
                unlockBody();
                resolve();
                return;
              }
              requestAnimationFrame(waitVisible);
            })();
            return;
          } catch (_) {
            hideTransition();
            unlockBody();
            resolve();
          }
        }
      });

      // Fade the new container in quickly so we never see an empty background behind the columns.
      tl.fromTo(transitionWrap || {},
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.35,
          ease: 'power2.out',
          onStart: function () {
            if (fadeEl) fadeEl.style.opacity = '1';
          }
        }
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
              window.WFApp.global.closeMenu({ immediate: true });
            }
          } catch (_) {}
        });
        window.barba.hooks.beforeEnter(function () {
          try {
            if (window.WFApp && window.WFApp.global && typeof window.WFApp.global.closeMenu === 'function') {
              window.WFApp.global.closeMenu({ immediate: true });
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

            // On hard reload, Webflow may briefly paint content before IX2 applies initial states.
            // Keep the overlay up and the container hidden until we explicitly reveal.
            try {
              ensureTransitionVisible();
              lockBody();
              if (data && data.next && data.next.container) {
                data.next.container.style.opacity = '0';
                data.next.container.style.visibility = 'hidden';
              }
            } catch (_) {}

            // Ensure correct first-load state
            var hasAnimated = sessionStorage.getItem('logoAnimated') === 'true';
            if (hasAnimated) document.body.classList.remove('first-load');

            // First load logo animation + enter transition
            await logoAnimationOnce();

            // Start mounting controller early but don't block the reveal.
            var ns = getNamespace(data, 'next');
            var mountPromise = mountNamespace(ns, data.next.container, data);

            // Let the swapped DOM paint before we animate reveal.
            await delay(0);
            // Make sure Webflow IX2 is initialized for this DOM before we reveal it.
            reinitWebflowIX2();

            // New hook: DOM swapped + IX2 ready, overlay still up.
            try { window.dispatchEvent(new CustomEvent('pageTransitionBeforeReveal')); } catch (_) {}

            await animateEnter(data.next && data.next.container);

            // Ensure controller is mounted before firing compatibility event.
            await mountPromise;
            // Old hook: after reveal + controller mount.
            try { window.dispatchEvent(new CustomEvent('pageTransitionCompleted')); } catch (_) {}

            // Ensure final visibility
            try {
              if (data && data.next && data.next.container) {
                data.next.container.style.opacity = '';
                data.next.container.style.visibility = '';
              }
            } catch (_) {}
          },
          async leave(data) {
            // Close menu overlays before navigating (prevents visual flash + wrong layering)
            try {
              if (window.WFApp && window.WFApp.global && typeof window.WFApp.global.closeMenu === 'function') {
                window.WFApp.global.closeMenu({ immediate: true });
              }
            } catch (_) {}

            // Kill only ScrollTriggers that belong to the outgoing container.
            try { killScrollTriggersIn(data && data.current && data.current.container); } catch (_) {}
            unmountNamespace(getNamespace(data, 'current'));

            // Hide current container immediately so we never show the old page after the leave animation.
            try {
              if (data && data.current && data.current.container) {
                data.current.container.style.opacity = '0';
              }
            } catch (_) {}

            // Play leave animation BEFORE we swap content
            await animateLeave();

            if (CONFIG.transitionOffset) await delay(CONFIG.transitionOffset);
          },
          async beforeEnter(data) {
            // Keep the incoming container hidden while Webflow IX2 applies initial states.
            // If we reveal too early, IX2 can re-hide/re-animate elements => flicker/double animations.
            try {
              if (data && data.next && data.next.container) {
                data.next.container.style.opacity = '0';
                data.next.container.style.visibility = 'hidden';
              }
            } catch (_) {}

            // Re-init Webflow interactions BEFORE revealing the new container.
            // This can take a few hundred ms; we keep the transition overlay up during this time.
            reinitWebflowIX2();
          },
          async enter(data) {
            // Start mounting controller early but don't block the reveal.
            var ns = getNamespace(data, 'next');
            var mountPromise = mountNamespace(ns, data.next.container, data);

            // Let the swapped DOM paint before we animate reveal.
            await delay(0);

            // New hook: DOM swapped + IX2 ready, overlay still up.
            try { window.dispatchEvent(new CustomEvent('pageTransitionBeforeReveal')); } catch (_) {}

            await animateEnter(data.next && data.next.container);

            // Ensure controller is mounted before firing compatibility event.
            await mountPromise;
            // Old hook: after reveal + controller mount.
            try { window.dispatchEvent(new CustomEvent('pageTransitionCompleted')); } catch (_) {}

            // Ensure final visibility (beforeEnter set it hidden to avoid IX2 flicker)
            try {
              if (data && data.next && data.next.container) {
                data.next.container.style.opacity = '';
                data.next.container.style.visibility = '';
              }
            } catch (_) {}
          },
          async after(data) {
            try { window.scrollTo(0, 0); } catch (_) {}

            if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
              try { window.ScrollTrigger.refresh(); } catch (_) {}
            }

            tryGlobalAfterEnter(data);
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
