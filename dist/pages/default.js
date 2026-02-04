(function () {
  'use strict';
  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  WFApp.pages.default = {
    init: function ({ container, namespace }) {
      // Safe fallback: do nothing, but you can put truly global per-page init here.
      // Note: keep heavy code out of this.
      return {
        destroy: function () {}
      };
    }
  };
})();
