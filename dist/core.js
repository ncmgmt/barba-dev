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
    namespaces: ['Home', 'Portfolio', 'Team', 'Insights', 'Contact', 'Imprint', 'Legal', 'PrivacyPolicy']
  };

  // ---- WFApp global registry ----

  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {}; // controllers register here
  WFApp._instances = WFApp._instances || {}; // namespace -> instance
  WFApp._loadedScripts = WFApp._loadedScripts || new Set();

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
          onUpdate: function () {
            cursor.setAttribute('x', cursor.getAttribute('x'));
            cursor.setAttribute('y', baseY);
          },
          onComplete: function () {
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

  function animateEnter() {
    // Transition out: columns move up, content fades in
    return new Promise(function (resolve) {
      var transitionWrap = qs(CONFIG.contentWrapSelector);
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

      if (transitionWrap) window.gsap.set(transitionWrap, { opacity: 1 });

      var tl = window.gsap.timeline({
        onComplete: function () {
          hideTransition();
          unlockBody();
          resolve();
        }
      });

      tl.from(transitionWrap || {}, {
        opacity: 0,
        duration: 1.3,
        ease: 'power4.inOut',
        onStart: function () {
          if (fadeEl) fadeEl.style.opacity = '1';
        }
      })
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

  function killGlobalScrollTriggers() {
    if (window.ScrollTrigger && typeof window.ScrollTrigger.getAll === 'function') {
      try {
        window.ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
      } catch (_) {}
    }
  }

  function delay(ms) {
    return new Promise(function (r) { setTimeout(r, ms || 0); });
  }

  // ---- Webflow IX reinit (optional) ----
  function reinitWebflowIX2() {
    // Only if Webflow runtime exists
    var Webflow = window.Webflow;
    if (!Webflow) return;

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

  // ---- Barba init ----

  function init() {
    assertBarba();

    window.barba.init({
      debug: CONFIG.debug,
      timeout: 7000,
      sync: true,
      transitions: [
        {
          name: 'default',
          async once(data) {
            // Ensure correct first-load state
            var hasAnimated = sessionStorage.getItem('logoAnimated') === 'true';
            if (hasAnimated) document.body.classList.remove('first-load');

            // First load logo animation + enter transition
            await logoAnimationOnce();

            // Mount page controller
            var ns = getNamespace(data, 'next');
            await mountNamespace(ns, data.next.container, data);

            await animateEnter();
          },
          async leave(data) {
            killGlobalScrollTriggers();
            unmountNamespace(getNamespace(data, 'current'));

            // Play leave animation BEFORE we swap content
            await animateLeave();

            if (CONFIG.transitionOffset) await delay(CONFIG.transitionOffset);
          },
          async beforeEnter(data) {
            reinitWebflowIX2();
          },
          async enter(data) {
            // Mount new controller then animate reveal
            var ns = getNamespace(data, 'next');
            await mountNamespace(ns, data.next.container, data);

            await animateEnter();
          },
          async after(data) {
            try { window.scrollTo(0, 0); } catch (_) {}

            if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
              try { window.ScrollTrigger.refresh(); } catch (_) {}
            }
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
