(function () {
  'use strict';

  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  // Insights: mostly CMS-driven; ensure hover/reveal effects are re-bound after cmsload renders.
  function ensureFsInsightsHooks() {
    WFApp._fsInsights = WFApp._fsInsights || { installed: false, currentContainer: null };
    if (WFApp._fsInsights.installed) return;
    WFApp._fsInsights.installed = true;

    window.fsAttributes = window.fsAttributes || [];

    function rebind() {
      var root = WFApp._fsInsights.currentContainer;
      if (!root) return;
      if (WFApp.global && typeof WFApp.global.rebind === 'function') {
        WFApp.global.rebind(root);
      }

      // Ensure pagination visible (ported from bw24/blog.js)
      var paginationWrapper = root.querySelector('.w-pagination-wrapper.pagination');
      if (paginationWrapper) paginationWrapper.style.opacity = '1';
    }

    window.fsAttributes.push([
      'cmsload',
      function (listInstances) {
        // Hook into renderitems
        if (listInstances && listInstances.length) {
          var listInstance = listInstances[0];
          if (listInstance && listInstance.on) {
            listInstance.on('renderitems', function () {
              rebind();
            });
          }
        }

        // Run at least once
        rebind();
      }
    ]);
  }

  WFApp.pages.Insights = {
    init: function ({ container }) {
      ensureFsInsightsHooks();
      WFApp._fsInsights.currentContainer = container;

      // Initial bind in case cms items already present
      setTimeout(function () {
        if (WFApp.global && typeof WFApp.global.rebind === 'function') {
          WFApp.global.rebind(container);
        }
      }, 50);

      // Signal to core that initial states are set and the page is ready to animate.
      try {
        var readyToken = (window.WFApp && window.WFApp.ready) ? window.WFApp.ready.token : 0;
        if (window.WFApp && window.WFApp.ready && typeof window.WFApp.ready.signal === 'function') window.WFApp.ready.signal(readyToken);
      } catch (_) {}

      return {
        destroy: function () {
          if (WFApp._fsInsights) WFApp._fsInsights.currentContainer = null;
        }
      };
    }
  };
})();
