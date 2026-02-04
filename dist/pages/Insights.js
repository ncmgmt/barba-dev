(function () {
  'use strict';
  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  WFApp.pages.Insights = {
    init: function ({ container }) {
      var ctx = null;
      if (window.gsap && container) {
        ctx = window.gsap.context(function () {
          // Insights animations
        }, container);
      }
      return { destroy: function () { if (ctx) ctx.revert(); } };
    }
  };
})();
