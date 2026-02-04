(function () {
  'use strict';
  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  WFApp.pages.Home = {
    init: function ({ container }) {
      // Example: initialize only Home-specific features
      // Put your migrated bw24 Home code here.

      var ctx = null;
      if (window.gsap && container) {
        ctx = window.gsap.context(function () {
          // GSAP animations for Home
        }, container);
      }

      return {
        destroy: function () {
          if (ctx) ctx.revert();
        }
      };
    }
  };
})();
