(function () {
  'use strict';

  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  // Contact: multi-step form logic (ported from bw24/form_contact*.js)
  // Notes:
  // - Barba-safe: no DOMContentLoaded; all selectors scoped to the swapped container.
  // - Requires: gsap (for step transitions). jQuery optional (we avoid it here).

  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  function qs(container, sel) {
    return container ? container.querySelector(sel) : null;
  }

  function qsa(container, sel) {
    return container ? Array.prototype.slice.call(container.querySelectorAll(sel)) : [];
  }

  function todayISO() {
    try { return new Date().toISOString().split('T')[0]; } catch (_) { return null; }
  }

  function hideTooltip() {
    var tooltip = document.querySelector('.layout_tooltip_wrap');
    var banner = document.querySelector('.banner_tooltip');
    if (tooltip) tooltip.remove();
    if (banner) banner.remove();
  }

  function showBannerTooltip(message) {
    var banner = document.createElement('div');
    banner.className = 'banner_tooltip';
    banner.innerText = message;
    document.body.appendChild(banner);

    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.width = '100%';
    banner.style.padding = '1rem';
    banner.style.backgroundColor = 'var(--z_color--sys-error-red)';
    banner.style.color = '#fff';
    banner.style.textAlign = 'center';
    banner.style.zIndex = '1000';

    setTimeout(function () {
      banner.style.top = '-100px';
      setTimeout(function () { banner.remove(); }, 300);
    }, 3000);
  }

  function showTooltip(element, message, isClick) {
    hideTooltip();

    var tooltip = document.createElement('div');
    tooltip.className = 'layout_tooltip_wrap';
    tooltip.innerText = message;

    if (isClick || isTouchDevice()) {
      if (isTouchDevice()) {
        showBannerTooltip(message);
        return;
      }

      document.body.appendChild(tooltip);
      tooltip.style.position = 'absolute';
      tooltip.style.display = 'block';

      var rect = element.getBoundingClientRect();
      var parent = element.closest('.form_main_wrap');
      var parentRect = parent ? parent.getBoundingClientRect() : rect;

      var maxWidth = Math.min(parentRect.width, 48 * 16);
      tooltip.style.maxWidth = maxWidth + 'px';

      var left = parentRect.left;
      left = Math.max(parentRect.left, Math.min(left, parentRect.right - maxWidth));
      var top = rect.bottom + 10;
      top = Math.min(parentRect.bottom, top);

      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
      return;
    }

    // hover follow
    document.body.appendChild(tooltip);
    tooltip.style.position = 'absolute';
    tooltip.style.display = 'block';

    function onMove(ev) {
      var tooltipRect = tooltip.getBoundingClientRect();
      var spaceRight = window.innerWidth - ev.clientX;
      var left2 = ev.pageX + 10;
      var top2 = ev.pageY + 10;
      if (spaceRight < tooltipRect.width) left2 = ev.pageX - tooltipRect.width - 10;
      tooltip.style.left = left2 + 'px';
      tooltip.style.top = top2 + 'px';
    }

    element.addEventListener('mousemove', onMove);
    element.addEventListener('mouseleave', hideTooltip);
  }

  function isValidInput(input, showErrors) {
    var isValid = true;
    var errorMessage = '';

    var value = (input.value || '').trim();
    var isRequired = !!input.required || input.getAttribute('aria-required') === 'true';
    var isEmpty = value === '';

    // not required -> empty ok
    if (!isRequired && isEmpty) {
      input.style.borderColor = '';
      input.removeAttribute('aria-invalid');
      var err = input.nextElementSibling;
      if (err && err.classList && err.classList.contains('error-message')) err.remove();
      return true;
    }

    if (input.type === 'email') {
      var looksLikeTest = /\btest\b/i.test(value);
      var basicEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
      isValid = basicEmail && !looksLikeTest;
      errorMessage = 'Please enter a valid email address.';
    } else if (input.type === 'url') {
      try {
        var withProto = /^https?:\/\//i.test(value) ? value : ('https://' + value);
        new URL(withProto);
        isValid = true;
      } catch (_) {
        isValid = false;
      }
      errorMessage = 'Please enter a valid URL.';
    } else if (input.type === 'date') {
      isValid = value !== '';
      errorMessage = 'Select a Date.';
    } else if (input.type === 'tel') {
      var phonePattern = /^\+\d{1,3}[\s.-]?\(?\d{1,4}?\)?[\s.-]?\d{6,}$/;
      isValid = phonePattern.test(value);
      errorMessage = 'Please enter a valid phone number with country code.';
    } else if ((input.tagName || '').toLowerCase() === 'select') {
      isValid = value !== '' && value !== 'Select Category';
      errorMessage = 'Please select a category.';
    } else {
      // text/textarea
      isValid = value !== '';
      errorMessage = 'This field is required.';
    }

    if (!isValid && showErrors) {
      input.style.borderColor = 'var(--z_color--sys-error-red)';
      input.setAttribute('aria-invalid', 'true');

      var errorElement = input.nextElementSibling;
      if (!errorElement || !errorElement.classList || !errorElement.classList.contains('error-message')) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.style.color = 'var(--z_color--sys-error-red)';
        input.parentNode.insertBefore(errorElement, input.nextSibling);
      }
      errorElement.innerText = errorMessage;
    } else if (isValid) {
      input.style.borderColor = '';
      input.removeAttribute('aria-invalid');
      var errorElement2 = input.nextElementSibling;
      if (errorElement2 && errorElement2.classList && errorElement2.classList.contains('error-message')) {
        errorElement2.remove();
      }
    }

    return isValid;
  }

  function validateStep(stepEl, showErrors) {
    var ok = true;

    // standard fields
    // In Webflow, inputs may not consistently carry a shared class across steps.
    // Validate all relevant fields in the current step.
    var inputs = stepEl.querySelectorAll('input, textarea, select');
    inputs.forEach(function (input) {
      if (input.dataset.dirty === 'true' || input.dataset.dirty === undefined) {
        if (!isValidInput(input, !!showErrors)) ok = false;
      }
    });

    // radios (Webflow uses w--redirected-checked)
    var radioButtons = stepEl.querySelectorAll('.form_main_option_link');
    if (radioButtons.length) {
      var checked = stepEl.querySelector('.form_main_option_link.w--redirected-checked');
      if (!checked) ok = false;
    }

    // range slider handles must be moved
    var rangeSliders = stepEl.querySelectorAll('.form_rangeslider-2_wrapper');
    rangeSliders.forEach(function (range) {
      var handles = range.querySelectorAll('[fs-rangeslider-element="handle"], [fs-rangeslider-element="handle-2"], [fs-rangeslider-element="handle-3"], [fs-rangeslider-element="handle-3-right"]');
      var moved = false;
      handles.forEach(function (h) { if (h.dataset.moved === 'true') moved = true; });
      if (!moved) ok = false;
    });

    return ok;
  }

  function updateNextButtonState(stepEl, nextButton) {
    if (!nextButton || !stepEl) return;
    var isValid = validateStep(stepEl, false);
    nextButton.classList.toggle('is-inactive', !isValid);
    nextButton.setAttribute('aria-disabled', (!isValid).toString());
  }

  function updateSubmitButtonState(messageField, submitButton) {
    if (!submitButton || !messageField) return;
    var ok = isValidInput(messageField, false);
    submitButton.classList.toggle('is-inactive', !ok);
    submitButton.disabled = !ok;
  }

  function animateStepTransition(oldStep, newStep, direction) {
    if (!window.gsap) {
      // fallback: simple show/hide
      var oldEl = document.querySelector('.form_main_step[data-form-step="' + oldStep + '"]');
      var newEl = document.querySelector('.form_main_step[data-form-step="' + newStep + '"]');
      if (oldEl) oldEl.style.display = 'none';
      if (newEl) newEl.style.display = 'flex';
      return;
    }

    var oldStepElement = document.querySelector('.form_main_step[data-form-step="' + oldStep + '"]');
    var newStepElement = document.querySelector('.form_main_step[data-form-step="' + newStep + '"]');
    var navigationButtons = document.querySelector('.form_navigation_buttons');

    if (!oldStepElement || !newStepElement || !navigationButtons) return;

    newStepElement.style.display = 'none';

    window.gsap.to(navigationButtons, {
      opacity: 0,
      duration: 0,
      onComplete: function () {
        navigationButtons.style.display = 'none';

        if (direction === 'next') {
          window.gsap.to(oldStepElement, {
            y: '-100%',
            opacity: 0,
            duration: 0.5,
            onComplete: function () {
              oldStepElement.style.display = 'none';
              window.gsap.fromTo(newStepElement, { y: '100%', opacity: 0 }, {
                y: '0%',
                opacity: 1,
                duration: 0.5,
                onStart: function () { newStepElement.style.display = 'flex'; },
                onComplete: function () {
                  window.gsap.to(navigationButtons, {
                    opacity: 1,
                    duration: 0.3,
                    onStart: function () { navigationButtons.style.display = 'flex'; }
                  });
                }
              });
            }
          });
        } else {
          window.gsap.to(oldStepElement, {
            y: '100%',
            opacity: 0,
            duration: 0.5,
            onComplete: function () {
              oldStepElement.style.display = 'none';
              window.gsap.fromTo(newStepElement, { y: '-100%', opacity: 0 }, {
                y: '0%',
                opacity: 1,
                duration: 0.5,
                onStart: function () { newStepElement.style.display = 'flex'; },
                onComplete: function () {
                  window.gsap.to(navigationButtons, {
                    opacity: 1,
                    duration: 0.3,
                    onStart: function () { navigationButtons.style.display = 'flex'; }
                  });
                }
              });
            }
          });
        }
      }
    });
  }

  WFApp.pages.Contact = {
    init: function ({ container }) {
      // Guard: if the contact form isn't on the page, no-op.
      var form = qs(container, '#Contact-Form');
      if (!form) {
        // still rebind global hover/reveal
        if (WFApp.global && typeof WFApp.global.rebind === 'function') WFApp.global.rebind(container);
        return { destroy: function () {} };
      }

      // Set min date
      var min = todayISO();
      if (min) {
        qsa(container, 'input[type="date"]').forEach(function (d) { d.setAttribute('min', min); });
      }

      var steps = qsa(container, '.form_main_step');
      var nextButton = qs(container, '.btn_main_wrap.bw-contact.is-next');
      var prevButton = qs(container, '.btn_main_wrap.bw-contact.is-prev');
      var submitButton = qs(container, 'input[type="submit"]');
      var messageField = qs(container, 'textarea[name="message"]');

      var currentStep = 'start';
      var stepHistory = [];
      var listeners = [];

      function on(el, ev, fn, opts) {
        if (!el) return;
        el.addEventListener(ev, fn, opts);
        listeners.push([el, ev, fn, opts]);
      }

      function getURLParameter(name) {
        var urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
      }

      function updateButtons(step) {
        if (prevButton) prevButton.style.display = (step === 'start') ? 'none' : '';
        if (nextButton) nextButton.style.display = (step === 'message') ? 'none' : '';
        if (submitButton) submitButton.style.display = (step === 'message') ? '' : 'none';

        // Ensure the CTA states are recomputed whenever visibility changes.
        var currentStepEl = form.querySelector('.form_main_step[data-form-step="' + currentStep + '"]');
        if (currentStepEl) updateNextButtonState(currentStepEl, nextButton);
        if (messageField && submitButton) updateSubmitButtonState(messageField, submitButton);
      }

      function requireByName(stepElement, name) {
        var el = stepElement.querySelector('[name="' + name + '"]');
        if (!el) return;
        el.required = true;
        el.setAttribute('aria-required', 'true');
      }

      function applyConditionalRequired(stepElement) {
        if (!stepElement) return;

        // reset
        stepElement.querySelectorAll('input, select, textarea').forEach(function (el) {
          el.required = false;
          el.removeAttribute('aria-required');
        });

        var step = stepElement.getAttribute('data-form-step');

        var selection = document.querySelector('input[name="selection"]:checked') ? document.querySelector('input[name="selection"]:checked').value : null;
        var selection2 = document.querySelector('input[name="selection-2"]:checked') ? document.querySelector('input[name="selection-2"]:checked').value : null;
        var isPitchPath = form.dataset.pathPitch === 'true' || selection === 'pitch';
        var isIrPath = selection === 'ir';
        var isSalesPath = selection2 === 'sales';

        // base
        if (step === 'start') {
          requireByName(stepElement, 'First-Name');
          requireByName(stepElement, 'Last-Name');
          requireByName(stepElement, 'Email');
        }
        if (step === 'message') {
          requireByName(stepElement, 'message');
        }
        if (step === 'event') {
          requireByName(stepElement, 'Event-Name');
          requireByName(stepElement, 'eventWebsite');
          requireByName(stepElement, 'date_field');
        }
        if (step === 'ir-2') {
          requireByName(stepElement, 'Phone-number');
        }

        // path-specific example (kept minimal, can be expanded to match bw24 exactly)
        if (step === 'general') {
          if (isPitchPath || isSalesPath || isIrPath || selection2 === 'career' || selection2 === 'event') {
            requireByName(stepElement, 'Company-Name');
          }
        }
      }

      function initializeStep(stepElement) {
        if (!stepElement) return;

        var fields = stepElement.querySelectorAll('input, select, textarea');

        fields.forEach(function (field) {
          if (field.dataset.bwValidateBound === 'true') return;
          field.dataset.bwValidateBound = 'true';

          on(field, 'input', function () {
            field.dataset.dirty = 'true';
            isValidInput(field, false);
            updateNextButtonState(stepElement, nextButton);
          });

          on(field, 'change', function () {
            field.dataset.dirty = 'true';
            isValidInput(field, false);
            updateNextButtonState(stepElement, nextButton);
          });

          on(field, 'focusout', function () {
            field.dataset.dirty = 'true';
            isValidInput(field, true);
            updateNextButtonState(stepElement, nextButton);
          });
        });

        // radio buttons
        qsa(stepElement, '.form_main_option_link').forEach(function (rb) {
          if (rb.dataset.bwRadioBound === 'true') return;
          rb.dataset.bwRadioBound = 'true';
          on(rb, 'click', function () {
            setTimeout(function () { updateNextButtonState(stepElement, nextButton); }, 100);
          });
        });

        // range sliders
        qsa(stepElement, '.form_rangeslider-2_wrapper').forEach(function (range) {
          var handles = range.querySelectorAll('[fs-rangeslider-element="handle"], [fs-rangeslider-element="handle-2"], [fs-rangeslider-element="handle-3"], [fs-rangeslider-element="handle-3-right"]');
          handles.forEach(function (h) {
            h.dataset.moved = 'false';
            if (h.dataset.bwHandleBound === 'true') return;
            h.dataset.bwHandleBound = 'true';
            on(h, 'mousedown', function () { h.dataset.moved = 'true'; });
            on(h, 'touchstart', function () { h.dataset.moved = 'true'; });
            on(h, 'mouseup', function () { h.dataset.moved = 'true'; updateNextButtonState(stepElement, nextButton); });
            on(h, 'touchend', function () { h.dataset.moved = 'true'; updateNextButtonState(stepElement, nextButton); });
          });
          on(range, 'input', function () { updateNextButtonState(stepElement, nextButton); });
        });

        updateNextButtonState(stepElement, nextButton);
      }

      function initializeMessageField() {
        if (!messageField || !submitButton) return;
        if (messageField.dataset.bwMsgBound === 'true') return;
        messageField.dataset.bwMsgBound = 'true';

        on(messageField, 'input', function () {
          messageField.dataset.dirty = 'true';
          updateSubmitButtonState(messageField, submitButton);
        });
        on(messageField, 'change', function () {
          messageField.dataset.dirty = 'true';
          updateSubmitButtonState(messageField, submitButton);
        });
        on(messageField, 'focusout', function () {
          messageField.dataset.dirty = 'true';
          isValidInput(messageField, true);
          updateSubmitButtonState(messageField, submitButton);
        });

        updateSubmitButtonState(messageField, submitButton);
      }

      function showStep(step) {
        var oldStep = currentStep;
        var direction = stepHistory.indexOf(step) !== -1 ? 'prev' : 'next';

        if (direction === 'next') stepHistory.push(oldStep);
        else stepHistory.pop();

        currentStep = step;

        steps.forEach(function (stepElement) {
          if (stepElement.getAttribute('data-form-step') === step) {
            initializeStep(stepElement);
          }
        });

        updateButtons(step);

        var currentStepEl = form.querySelector('.form_main_step[data-form-step="' + currentStep + '"]');
        applyConditionalRequired(currentStepEl);
        updateNextButtonState(currentStepEl, nextButton);

        if (step === 'message') initializeMessageField();

        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) { window.scrollTo(0, 0); }

        if (oldStep !== 'start' || step !== 'start') {
          animateStepTransition(oldStep, currentStep, direction);
        }
      }

      // Prevent Enter submit mid-flow
      on(form, 'keydown', function (event) {
        if (event.keyCode === 13) {
          if (currentStep !== 'message' || (submitButton && submitButton.classList.contains('is-inactive'))) {
            event.preventDefault();
          }
        }
      });

      // Buttons
      on(nextButton, 'click', function (e) {
        e.preventDefault();
        var currentStepEl = form.querySelector('.form_main_step[data-form-step="' + currentStep + '"]');
        if (!currentStepEl) return;

        if (!validateStep(currentStepEl, true)) {
          showTooltip(nextButton, 'Please fill in the required fields.', true);
          return;
        }

        // find next step in DOM order
        var idx = steps.findIndex(function (s) { return s.getAttribute('data-form-step') === currentStep; });
        if (idx >= 0 && idx < steps.length - 1) {
          var next = steps[idx + 1].getAttribute('data-form-step');
          showStep(next);
        }
      });

      on(prevButton, 'click', function (e) {
        e.preventDefault();
        if (!stepHistory.length) return;
        var prev = stepHistory[stepHistory.length - 1];
        showStep(prev);
      });

      // Initialize
      var pathParam = getURLParameter('path');
      showStep('start');
      if (pathParam === 'pitch') form.dataset.pathPitch = 'true';

      // Ensure global hover/reveal bindings on this page
      if (WFApp.global && typeof WFApp.global.rebind === 'function') WFApp.global.rebind(container);

      return {
        destroy: function () {
          listeners.forEach(function (x) {
            try { x[0].removeEventListener(x[1], x[2], x[3]); } catch (_) {}
          });
          listeners = [];
          hideTooltip();
        }
      };
    }
  };
})();
