/*
  Global (persistent) behaviors for Webflow + Barba.
  Load this globally (Site Settings) AFTER dependencies (gsap, ScrollTrigger, jQuery if used).

  This file is intentionally small: it offers hooks you can extend.
  Page-specific code belongs in dist/pages/<Namespace>.js.
*/

(function () {
  'use strict';

  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.global = WFApp.global || {};

  var didInit = false;

  WFApp.global.initOnce = function initOnce() {
    if (didInit) return;
    didInit = true;

    // Place truly global one-time init here.
    // Examples:
    // - theme toggle listener (persistent nav)
    // - menu open/close (persistent nav)
    // - blockwall background that persists across pages

  };

  WFApp.global.afterEnter = function afterEnter(/* data */) {
    // Called after every Barba enter.
    // Use for refreshes that depend on the new DOM.

    if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
      try { window.ScrollTrigger.refresh(); } catch (_) {}
    }
  };

})();
