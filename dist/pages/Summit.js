(function () {
  'use strict';

  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  // Summit uses only global behaviors for now.
  WFApp.pages.Summit = {
    init: function () {
      return { destroy: function () {} };
    }
  };
})();
