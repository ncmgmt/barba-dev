/* Page controller template

  Register under window.WFApp.pages["Namespace"]
  Must not auto-run; core mounts it via init({container}).

  Recommended GSAP cleanup:
    const ctx = gsap.context(() => { ... }, container);
    return { destroy(){ ctx.revert(); } }
*/

(function () {
  'use strict';

  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  WFApp.pages.Template = {
    init: function ({ container }) {
      // Only query inside container
      // const el = container.querySelector('[data-something]');
      // if (!el) return;

      var ctx = null;
      if (window.gsap && container) {
        ctx = window.gsap.context(function () {
          // gsap/ScrollTrigger code here
        }, container);
      }

      return {
        destroy: function () {
          // Kill GSAP context (kills ScrollTriggers created inside too)
          if (ctx) ctx.revert();
        }
      };
    }
  };
})();
