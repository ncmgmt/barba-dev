(function () {
  'use strict';
  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  WFApp.pages.Legal = {
    init: function ({ container }) {
      // Signal readiness immediately (static page)
      try {
        var readyToken = (WFApp && WFApp.ready) ? WFApp.ready.token : 0;
        if (WFApp.ready && typeof WFApp.ready.signal === 'function') WFApp.ready.signal(readyToken);
      } catch (_) {}

      return { destroy: function () {} };
    }
  };
})();
