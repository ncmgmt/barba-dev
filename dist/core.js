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

    // Transition overlay selector (optional)
    transitionScreenSelector: '.transition-screen',

    // Delay between leave-start and DOM swap (ms)
    transitionOffset: 300,

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

  // ---- Transition helpers (optional GSAP overlay) ----

  function transitionIn() {
    var sel = CONFIG.transitionScreenSelector;
    var el = sel ? document.querySelector(sel) : null;
    if (!el) return;

    // If GSAP present, animate; else just show/hide quickly
    if (window.gsap) {
      window.gsap.killTweensOf(el);
      window.gsap.set(el, { autoAlpha: 0 });
      window.gsap.to(el, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' });
    } else {
      el.style.opacity = '1';
      el.style.visibility = 'visible';
    }
  }

  function transitionOut() {
    var sel = CONFIG.transitionScreenSelector;
    var el = sel ? document.querySelector(sel) : null;
    if (!el) return;

    if (window.gsap) {
      window.gsap.killTweensOf(el);
      window.gsap.to(el, { autoAlpha: 0, duration: 0.35, ease: 'power2.out' });
    } else {
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
    }
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
            // Initial load: mount page controller
            var ns = getNamespace(data, 'next');
            await mountNamespace(ns, data.next.container, data);
            transitionOut();
          },
          async leave(data) {
            // Start overlay, stop triggers, unmount old controller
            transitionIn();
            killGlobalScrollTriggers();
            unmountNamespace(getNamespace(data, 'current'));

            // Small offset for nicer swap
            await delay(CONFIG.transitionOffset);
          },
          async beforeEnter(data) {
            // Reset Webflow interactions (optional)
            reinitWebflowIX2();
          },
          async enter(data) {
            // Mount new controller then transition out
            var ns = getNamespace(data, 'next');
            await mountNamespace(ns, data.next.container, data);
            transitionOut();
          },
          async after(data) {
            // Always scroll to top after navigation (typical for Webflow sites)
            try { window.scrollTo(0, 0); } catch (_) {}

            // Refresh ScrollTrigger if present
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
