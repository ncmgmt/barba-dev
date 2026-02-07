(function () {
  'use strict';

  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  // Contact: multi-step form logic (ported from bw24/form_contact.js + form_contact_functions.js)
  // Barba-safe: all bindings scoped to the swapped container, with destroy cleanup.

  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  function qs(root, sel) {
    return root ? root.querySelector(sel) : null;
  }

  function qsa(root, sel) {
    return root ? Array.prototype.slice.call(root.querySelectorAll(sel)) : [];
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
    if (isClick === void 0) isClick = false;
    hideTooltip();

    if (!element) return;

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
      tooltip.style.maxWidth = '';
    }

    element.addEventListener('mousemove', onMove);
    element.addEventListener('mouseleave', hideTooltip);
  }

  function isValidInput(input, showErrors) {
    if (showErrors === void 0) showErrors = false;

    var isValid = true;
    var errorMessage = '';

    var value = (input.value || '').trim();
    var isRequired = !!input.required || input.getAttribute('aria-required') === 'true';
    var isEmpty = value === '';

    if (!isRequired && isEmpty) {
      input.style.borderColor = '';
      input.removeAttribute('aria-invalid');
      var err0 = input.nextElementSibling;
      if (err0 && err0.classList && err0.classList.contains('error-message')) err0.remove();
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
      if (errorElement2 && errorElement2.classList && errorElement2.classList.contains('error-message')) errorElement2.remove();
    }

    return isValid;
  }

  function validateStep(stepElement, showErrors) {
    if (showErrors === void 0) showErrors = false;
    var isValid = true;

    var inputs = stepElement.querySelectorAll('input.form_main_field_input, textarea.form_main_field_input, select.form_main_field_input');
    if (!inputs.length) inputs = stepElement.querySelectorAll('input, textarea, select');

    inputs.forEach(function (input) {
      if (input.dataset.dirty === 'true' || input.dataset.dirty === undefined) {
        if (!isValidInput(input, showErrors)) isValid = false;
      }
    });

    // radios
    var radioButtons = stepElement.querySelectorAll('.form_main_option_link');
    if (radioButtons.length) {
      var checked = stepElement.querySelector('.form_main_option_link.w--redirected-checked');
      if (!checked) isValid = false;
    }

    // range sliders
    var rangeSliders = stepElement.querySelectorAll('.form_rangeslider-2_wrapper');
    rangeSliders.forEach(function (rangeSlider) {
      var handles = rangeSlider.querySelectorAll('[fs-rangeslider-element="handle"], [fs-rangeslider-element="handle-2"], [fs-rangeslider-element="handle-3"], [fs-rangeslider-element="handle-3-right"]');
      var moved = false;
      handles.forEach(function (h) { if (h.dataset.moved === 'true') moved = true; });
      if (!moved) {
        isValid = false;
        if (showErrors) handles.forEach(function (h) { h.style.borderColor = 'var(--z_color--sys-error-red)'; });
      } else {
        handles.forEach(function (h) { h.style.borderColor = ''; });
      }
    });

    return isValid;
  }

  function updateNextButtonState(stepElement, nextButton) {
    var ok = validateStep(stepElement, false);
    if (!nextButton) return;
    if (ok) {
      nextButton.classList.remove('is-inactive');
      nextButton.style.cursor = 'pointer';
      nextButton.setAttribute('aria-disabled', 'false');
    } else {
      nextButton.classList.add('is-inactive');
      nextButton.style.cursor = 'not-allowed';
      nextButton.setAttribute('aria-disabled', 'true');
    }
  }

  function updateSubmitButtonState(messageField, submitButton) {
    if (!messageField || !submitButton) return;
    var ok = isValidInput(messageField, false);
    if (ok) {
      submitButton.classList.remove('is-inactive');
      submitButton.style.cursor = 'pointer';
    } else {
      submitButton.classList.add('is-inactive');
      submitButton.style.cursor = 'not-allowed';
    }
  }

  function getTooltipMessage(stepElement) {
    var inputs = stepElement.querySelectorAll('input, textarea, select');
    if (inputs.length) {
      var first = inputs[0];
      if (first.type === 'radio' || (first.tagName || '').toLowerCase() === 'select') {
        return 'Please make a selection.';
      }
      if (first.type === 'range' || (first.classList && first.classList.contains('form_rangeslider_input'))) {
        return 'Please adjust the slider to a valid value.';
      }
    }
    return 'Please fill in the required fields.';
  }

  function animateStepTransition(oldStep, newStep, direction) {
    // Prefer gsap, but allow fallback
    if (!window.gsap) {
      var oldEl0 = document.querySelector('.form_main_step[data-form-step="' + oldStep + '"]');
      var newEl0 = document.querySelector('.form_main_step[data-form-step="' + newStep + '"]');
      if (oldEl0) oldEl0.style.display = 'none';
      if (newEl0) newEl0.style.display = 'flex';
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
      var form = qs(container, '#Contact-Form');
      if (!form) {
        if (WFApp.global && typeof WFApp.global.rebind === 'function') WFApp.global.rebind(container);
        return { destroy: function () {} };
      }

      // Set min date
      var min = todayISO();
      if (min) {
        qsa(container, 'input[type="date"]').forEach(function (d) { d.setAttribute('min', min); });
      }

      // Datepicker helpers (from bw24)
      var dateInput = qs(container, '#datepicker');
      var datepickerWrapper = qs(container, '#datepicker-wrap');
      function updateDateHasValue() {
        if (!dateInput) return;
        if (dateInput.value) dateInput.classList.add('date-input--has-value');
        else dateInput.classList.remove('date-input--has-value');
      }
      if (dateInput) {
        updateDateHasValue();
        dateInput.addEventListener('change', updateDateHasValue);
      }
      if (datepickerWrapper && dateInput && typeof dateInput.showPicker === 'function') {
        datepickerWrapper.addEventListener('click', function (event) {
          if (event.target !== dateInput) {
            event.preventDefault();
            try { dateInput.showPicker(); } catch (_) {}
          }
        });
      }

      // Capture readiness token at init-time to avoid late signals resolving a newer navigation.
      var readyToken = 0;
      try { readyToken = (WFApp && WFApp.ready) ? WFApp.ready.token : 0; } catch (_) {}

      // Job radio values
      var jobRadios = qsa(container, 'input[name="Job"]');
      jobRadios.forEach(function (radio) {
        var label = radio.closest('label');
        if (!label) return;
        var jobTypeEl = qs(label, '[data-job-type]');
        var jobTitleEl = qs(label, '[data-job-titel]');
        if (!jobTypeEl || !jobTitleEl) return;
        var jobType = jobTypeEl.getAttribute('data-job-type');
        var jobTitle = jobTitleEl.getAttribute('data-job-titel');
        radio.value = String(jobType || '') + ' - ' + String(jobTitle || '');
      });

      var steps = qsa(container, '.form_main_step');
      var nextButton = qs(container, '.btn_main_wrap.bw-contact.is-next');
      var prevButton = qs(container, '.btn_main_wrap.bw-contact.is-prev');
      var submitButton = qs(container, 'input[type="submit"]');
      var messageField = qs(container, 'textarea[name="message"]');

      var currentStep = 'start';
      var stepHistory = [];
      var listeners = [];

      function on(el, ev, fn, opts) {
        if (!el || !el.addEventListener) return;
        el.addEventListener(ev, fn, opts);
        listeners.push([el, ev, fn, opts]);
      }

      function getURLParameter(name) {
        try {
          var urlParams = new URLSearchParams(window.location.search);
          return urlParams.get(name);
        } catch (_) {
          return null;
        }
      }

      function requireByName(stepElement, name) {
        var el = qs(stepElement, '[name="' + name + '"]');
        if (!el) return;
        el.required = true;
        el.setAttribute('aria-required', 'true');
      }

      function applyConditionalRequired(stepElement) {
        if (!stepElement) return;

        // Reset required flags within the current step.
        qsa(stepElement, 'input, select, textarea').forEach(function (el) {
          el.required = false;
          el.removeAttribute('aria-required');
        });

        var step = stepElement.getAttribute('data-form-step');

        // Determine active path from selections within this container.
        var selection = qs(container, 'input[name="selection"]:checked');
        var selection2 = qs(container, 'input[name="selection-2"]:checked');
        var isPitchPath = form.dataset.pathPitch === 'true' || (selection && selection.value === 'pitch');
        var isIrPath = selection && selection.value === 'ir';
        var isSalesPath = selection2 && selection2.value === 'sales';

        // Base requirements
        switch (step) {
          case 'start':
            requireByName(stepElement, 'First-Name');
            requireByName(stepElement, 'Last-Name');
            requireByName(stepElement, 'Email');
            break;
          case 'message':
            requireByName(stepElement, 'message');
            break;
          case 'event':
            requireByName(stepElement, 'Event-Name');
            requireByName(stepElement, 'eventWebsite');
            requireByName(stepElement, 'date_field');
            break;
          case 'ir-2':
            requireByName(stepElement, 'Phone-number');
            break;
          default:
            break;
        }

        // Path-specific requirements
        if (step === 'general') {
          if (isPitchPath || isSalesPath || isIrPath || (selection2 && (selection2.value === 'career' || selection2.value === 'event'))) {
            requireByName(stepElement, 'Company-Name');
          }
        }

        if (step === 'sales-1') {
          if (isSalesPath) requireByName(stepElement, 'category');
        }
      }

      function initializeStep(stepElement) {
        if (!stepElement) return;

        var fields = qsa(stepElement, 'input, select, textarea');
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

        // Radio buttons
        qsa(stepElement, '.form_main_option_link').forEach(function (rb) {
          if (rb.dataset.bwRadioBound === 'true') return;
          rb.dataset.bwRadioBound = 'true';
          on(rb, 'click', function () {
            setTimeout(function () {
              updateNextButtonState(stepElement, nextButton);
            }, 100);
          });
        });

        // Range sliders
        qsa(stepElement, '.form_rangeslider-2_wrapper').forEach(function (rangeSlider) {
          var handles = rangeSlider.querySelectorAll('[fs-rangeslider-element="handle"], [fs-rangeslider-element="handle-2"], [fs-rangeslider-element="handle-3"], [fs-rangeslider-element="handle-3-right"]');
          handles.forEach(function (handle) {
            handle.dataset.moved = 'false';
            if (handle.dataset.bwHandleBound === 'true') return;
            handle.dataset.bwHandleBound = 'true';
            on(handle, 'mousedown', function () { handle.dataset.moved = 'true'; });
            on(handle, 'touchstart', function () { handle.dataset.moved = 'true'; });
            on(handle, 'mouseup', function () { handle.dataset.moved = 'true'; updateNextButtonState(stepElement, nextButton); });
            on(handle, 'touchend', function () { handle.dataset.moved = 'true'; updateNextButtonState(stepElement, nextButton); });
          });
          on(rangeSlider, 'input', function () { updateNextButtonState(stepElement, nextButton); });
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

      function updateButtons(step) {
        if (prevButton) prevButton.style.display = (stepHistory.length > 1) ? 'inline-block' : 'none';
        if (nextButton) nextButton.style.display = (step === 'message') ? 'none' : 'inline-block';
        if (submitButton) submitButton.style.display = (step === 'message') ? 'inline-block' : 'none';
      }

      function getNextStep(step) {
        var currentStepElement = qs(form, '.form_main_step[data-form-step="' + step + '"]');
        if (!currentStepElement) return null;

        var nextStep;
        var isPitchPath = form.dataset.pathPitch === 'true';

        if (isPitchPath && step === 'start') {
          nextStep = 'general';
        } else if (isPitchPath && step === 'general') {
          nextStep = 'pitch-1';
        } else if (step === 'start') {
          nextStep = 'select-1';
        } else if (step === 'general') {
          var previousStep = stepHistory[stepHistory.length - 1];
          if (previousStep === 'select-1') {
            var selected1 = qs(container, 'input[name="selection"]:checked');
            if (selected1) {
              if (selected1.value === 'pitch') nextStep = 'pitch-1';
              else if (selected1.value === 'ir') nextStep = 'ir-1';
            }
          } else if (previousStep === 'ir-1') {
            var irSel = qs(container, 'input[name="IR-Selection"]:checked');
            if (irSel && irSel.value === 'corporate') nextStep = 'ir-1a';
          } else if (previousStep === 'select-2') {
            var selected2 = qs(container, 'input[name="selection-2"]:checked');
            if (selected2) {
              if (selected2.value === 'sales') nextStep = 'sales-1';
              else if (selected2.value === 'pr') nextStep = 'message';
            }
          }
        } else {
          var selectedRadio = qs(currentStepElement, 'input[type="radio"]:checked');
          if (selectedRadio) {
            nextStep = selectedRadio.getAttribute('data-form-path');
            if (nextStep === 'sales' || nextStep === 'pr') nextStep = 'general';
            else if (nextStep === 'corporate') nextStep = 'general';
          } else {
            nextStep = currentStepElement.getAttribute('data-form-target');
          }
        }

        return nextStep;
      }

      function getPreviousStep() {
        if (stepHistory.length > 1) return stepHistory.pop();
        return null;
      }

      function showStep(step) {
        var oldStep = currentStep;
        var direction = stepHistory.indexOf(step) !== -1 ? 'prev' : 'next';

        currentStep = step;

        steps.forEach(function (stepElement) {
          if (stepElement.getAttribute('data-form-step') === step) initializeStep(stepElement);
        });

        updateButtons(step);

        var currentStepEl = qs(form, '.form_main_step[data-form-step="' + currentStep + '"]');
        applyConditionalRequired(currentStepEl);
        updateNextButtonState(currentStepEl, nextButton);

        if (step === 'message') initializeMessageField();

        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) { window.scrollTo(0, 0); }

        if (oldStep !== 'start' || step !== 'start') {
          animateStepTransition(oldStep, currentStep, direction);
        }
      }

      function goToNextStep() {
        var currentStepElement = qs(form, '.form_main_step[data-form-step="' + currentStep + '"]');
        if (!currentStepElement) return;

        if (validateStep(currentStepElement, true)) {
          var nextStep = getNextStep(currentStep);
          if (nextStep) {
            stepHistory.push(currentStep);
            showStep(nextStep);
          }
        } else {
          var msg = getTooltipMessage(currentStepElement);
          showTooltip(nextButton, msg, true);
        }
      }

      function goToPreviousStep() {
        var prev = getPreviousStep();
        if (prev) showStep(prev);
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
      on(prevButton, 'click', function (e) {
        e.preventDefault();
        goToPreviousStep();
      });

      on(nextButton, 'click', function (e) {
        e.preventDefault();

        if (nextButton && !nextButton.classList.contains('is-inactive')) {
          goToNextStep();
        } else {
          var currentStepElement = qs(form, '.form_main_step[data-form-step="' + currentStep + '"]');
          if (!currentStepElement) return;
          var msg = getTooltipMessage(currentStepElement);
          validateStep(currentStepElement, true);
          if (window.innerWidth <= 768) showTooltip(nextButton, msg, true);
          else showTooltip(nextButton, msg);
        }
      });

      on(nextButton, 'mouseenter', function () {
        if (nextButton && nextButton.classList.contains('is-inactive')) {
          var currentStepElement = qs(form, '.form_main_step[data-form-step="' + currentStep + '"]');
          if (!currentStepElement) return;
          var msg = getTooltipMessage(currentStepElement);
          showTooltip(nextButton, msg);
        }
      });

      on(nextButton, 'mouseleave', hideTooltip);

      on(submitButton, 'click', function (event) {
        var currentStepElement = qs(form, '.form_main_step[data-form-step="' + currentStep + '"]');
        if (!currentStepElement) return;
        if (!validateStep(currentStepElement, true)) {
          event.preventDefault();
          if (window.innerWidth <= 768) showTooltip(submitButton, 'Please fill in the required fields.', true);
          else showTooltip(submitButton, 'Please fill in the required fields.');
        }
      });

      on(submitButton, 'mouseenter', function () {
        if (submitButton && submitButton.classList.contains('is-inactive')) {
          showTooltip(submitButton, 'Please fill in the required fields.');
        }
      });

      on(submitButton, 'mouseleave', hideTooltip);

      // Initialize
      showStep(currentStep);

      var pathParam = getURLParameter('path');
      if (pathParam === 'pitch') form.dataset.pathPitch = 'true';

      // Ensure global hover/reveal bindings on this page
      if (WFApp.global && typeof WFApp.global.rebind === 'function') WFApp.global.rebind(container);

      // Finsweet Attributes (rangeslider) is DOMContentLoaded-driven in many setups.
      // After a Barba swap we need to re-init it, otherwise handles won't bind.
      window.fsAttributes = window.fsAttributes || [];
      setTimeout(function () {
        try {
          var fs = window.fsAttributes;
          if (fs && fs.rangeslider && typeof fs.rangeslider.init === 'function') fs.rangeslider.init();
        } catch (_) {}
      }, 0);

      // Signal to core that initial states are set and the page is ready to animate.
      try {
        if (window.WFApp && window.WFApp.ready && typeof window.WFApp.ready.signal === 'function') {
          window.WFApp.ready.signal(readyToken);
        }
      } catch (_) {}

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
