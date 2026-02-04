(function () {
  'use strict';

  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  // --- PortfolioDecode (ported from bw24/portfolio-decode.js, slightly simplified) ---
  function ensurePortfolioDecode() {
    if (window.PortfolioDecode) return;

    function portfolioRandomCharacterDate() {
      var chars = '/()?[]0123456789';
      return chars.charAt(Math.floor(Math.random() * chars.length));
    }

    function portfolioRandomCharacterTag() {
      var chars = 'ABCKLOWXabcdefghijklmnopqrstuvwxyz';
      return chars.charAt(Math.floor(Math.random() * chars.length));
    }

    function portfolioDecodeEffect(el, randomCharFunc, duration, useBlocks, direction) {
      if (useBlocks === void 0) useBlocks = false;
      if (direction === void 0) direction = 'forward';

      var originalText = el.dataset.originalText || el.textContent;
      el.dataset.originalText = originalText;
      el.textContent = '';

      var charBoxes = originalText.split('').map(function (char) {
        var charBox = document.createElement('span');
        charBox.className = 'char-box';
        var charSpan = document.createElement('span');
        charSpan.className = 'char';
        charSpan.innerHTML = char === ' ' ? '&nbsp;' : char;
        charBox.appendChild(charSpan);
        el.appendChild(charBox);
        return charBox;
      });

      el.style.display = 'inline-block';
      el.style.opacity = '0';
      el.style.visibility = 'hidden';

      var startTime = Date.now();

      function update() {
        var elapsedTime = Date.now() - startTime;
        var progress = Math.min(elapsedTime / duration, 1);

        if (progress > 0) {
          el.style.opacity = '1';
          el.style.visibility = 'visible';
        }

        charBoxes.forEach(function (charBox, i) {
          var index = direction === 'reverse' ? charBoxes.length - 1 - i : i;
          var charStartTime = duration * (index / originalText.length);
          var charEndTime = charStartTime + duration / originalText.length;
          var charSpan = charBox.querySelector('.char');

          if (elapsedTime < charStartTime) {
            charSpan.innerHTML = '&nbsp;';
          } else if (elapsedTime < charEndTime) {
            charSpan.textContent = randomCharFunc();
          } else {
            charSpan.innerHTML = originalText[index] === ' ' ? '&nbsp;' : originalText[index];
          }

          if (useBlocks) {
            var bgBox = charBox.querySelector('.bg-box');
            if (!bgBox) {
              bgBox = document.createElement('span');
              bgBox.className = 'bg-box';
              charBox.insertBefore(bgBox, charSpan);
            }
            bgBox.style.opacity = elapsedTime < charEndTime ? '1' : '0';
          }
        });

        if (progress < 1) requestAnimationFrame(update);
      }

      requestAnimationFrame(update);
    }

    function portfolioHoverEffect(el) {
      if (document.body.classList.contains('animations-disabled') || el.dataset.hovering === 'true' || el.dataset.useBlocks !== 'true') return;

      el.dataset.hovering = 'true';
      var originalText = el.dataset.originalText || el.textContent;
      var charBoxes = el.querySelectorAll('.char-box');
      var duration = 75;

      function updateHoverEffect(index) {
        if (index >= charBoxes.length) {
          el.dataset.hovering = 'false';
          return;
        }

        var charBox = charBoxes[index];
        var charSpan = charBox.querySelector('.char');
        var originalChar = originalText[index];
        var bgBox = charBox.querySelector('.bg-box');

        if (!bgBox) {
          bgBox = document.createElement('span');
          bgBox.className = 'bg-box';
          charBox.insertBefore(bgBox, charSpan);
        }

        bgBox.style.opacity = '1';
        var startTime = Date.now();

        function tick() {
          var elapsedTime = Date.now() - startTime;
          var progress = Math.min(elapsedTime / duration, 1);
          if (progress < 1) {
            charSpan.textContent = portfolioRandomCharacterTag();
            requestAnimationFrame(tick);
          } else {
            charSpan.innerHTML = originalChar === ' ' ? '&nbsp;' : originalChar;
            bgBox.style.opacity = '0';
            updateHoverEffect(index + 1);
          }
        }

        requestAnimationFrame(tick);
      }

      updateHoverEffect(0);
    }

    function portfolioAddHoverAndClickEffect(item) {
      if (!(item instanceof Element)) return;

      item.addEventListener('mouseenter', function () {
        var textElements = item.querySelectorAll('[data-use-blocks="true"]');
        textElements.forEach(function (el) { portfolioHoverEffect(el); });
        item.classList.add('gradient-hover');
      });

      item.addEventListener('mouseleave', function () {
        item.classList.remove('gradient-hover');
      });

      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        item.addEventListener('click', function () {
          var textElements = item.querySelectorAll('[data-use-blocks="true"]');
          textElements.forEach(function (el) { portfolioHoverEffect(el); });
          item.classList.add('gradient-click');
        });
      }
    }

    window.PortfolioDecode = {
      decodeEffect: portfolioDecodeEffect,
      randomCharacterDate: portfolioRandomCharacterDate,
      randomCharacterTag: portfolioRandomCharacterTag,
      hoverEffect: portfolioHoverEffect,
      addHoverAndClickEffect: portfolioAddHoverAndClickEffect
    };
  }

  function initPortfolioFilter(container) {
    // Ported from bw24/portfolio-filter_gsap.js but without DOMContentLoaded
    var destroyers = [];

    var filterContainers = container.querySelectorAll('.layout_portfolio_filter');
    filterContainers.forEach(function (filterContainer) {
      var filterHeadWrapEl = filterContainer.querySelector('.filter_head_wrap');
      var portfolioFilterMenuEl = filterContainer.querySelector('.portfolio_filter_menu');
      var filterButtonEl = filterContainer.querySelector('.filter_icon_contain');
      var filterElements = [
        filterContainer.querySelector('.filter_location'),
        filterContainer.querySelector('.filter_stage'),
        filterContainer.querySelector('.filter_status')
      ].filter(Boolean);

      var cmsItemResults = filterContainer.querySelector('.cms_item_results');
      var filterClearText = filterContainer.querySelector('.filter_clear_text');

      if (!filterHeadWrapEl || !portfolioFilterMenuEl || !filterButtonEl || !window.gsap) return;

      // Initial state
      portfolioFilterMenuEl.style.height = '0';
      portfolioFilterMenuEl.style.width = '0';
      portfolioFilterMenuEl.style.opacity = '1';
      portfolioFilterMenuEl.style.overflow = 'hidden';
      portfolioFilterMenuEl.style.border = 'none';
      portfolioFilterMenuEl.style.visibility = 'hidden';

      function animateFilterElements() {
        var timeline = window.gsap.timeline();
        filterElements.forEach(function (filterEl, index) {
          var delay = index * 0.2;
          timeline.fromTo(filterEl, { opacity: 0, y: 20 }, { duration: 0.4, opacity: 1, y: 0, ease: 'expo.inOut' }, delay);

          var filterHeadText = filterEl.querySelector('.filter_head_text');
          var filterListWrapper = filterEl.querySelector('.filter_list_wrapper');
          var filterListContain = filterListWrapper ? filterListWrapper.querySelector('.filter_list_contain') : null;
          var filterListItems = filterListContain ? filterListContain.querySelectorAll('.filter_list_item') : [];

          if (filterHeadText) timeline.fromTo(filterHeadText, { opacity: 0, y: 20 }, { duration: 0.4, opacity: 1, y: 0, ease: 'expo.inOut' }, delay + 0.1);
          if (filterListWrapper) timeline.fromTo(filterListWrapper, { opacity: 0, y: 20 }, { duration: 0.4, opacity: 1, y: 0, ease: 'expo.inOut' }, delay + 0.2);
          if (filterListItems.length) timeline.fromTo(filterListItems, { opacity: 0, y: 20 }, { duration: 0.4, opacity: 1, y: 0, stagger: 0.1, ease: 'expo.inOut' }, delay + 0.3);
        });

        if (cmsItemResults) timeline.fromTo(cmsItemResults, { opacity: 0 }, { duration: 0.4, opacity: 1, ease: 'expo.inOut' }, '+=0.3');
        if (filterClearText) timeline.fromTo(filterClearText, { opacity: 0 }, { duration: 0.4, opacity: 1, ease: 'expo.inOut' }, '-=0.2');
      }

      function setMenuSize(open) {
        if (open) {
          portfolioFilterMenuEl.style.height = 'auto';
          portfolioFilterMenuEl.style.width = 'auto';
          portfolioFilterMenuEl.style.opacity = '1';
          var autoHeight = portfolioFilterMenuEl.offsetHeight + 'px';
          var autoWidth = portfolioFilterMenuEl.offsetWidth + 'px';
          portfolioFilterMenuEl.style.height = '0';
          portfolioFilterMenuEl.style.width = '0';

          window.gsap.to(portfolioFilterMenuEl, {
            duration: 0.3,
            height: autoHeight,
            width: autoWidth,
            opacity: 1,
            visibility: 'visible',
            ease: 'expo.inOut',
            onComplete: function () {
              portfolioFilterMenuEl.style.height = 'auto';
              portfolioFilterMenuEl.style.width = 'auto';
            }
          });

          animateFilterElements();
        } else {
          window.gsap.to(portfolioFilterMenuEl, {
            duration: 0.3,
            height: 0,
            width: 0,
            opacity: 1,
            visibility: 'visible',
            ease: 'expo.inOut',
            onComplete: function () {
              portfolioFilterMenuEl.style.height = '0';
              portfolioFilterMenuEl.style.width = '0';
              portfolioFilterMenuEl.style.opacity = '1';
            }
          });

          window.gsap.to(filterElements, {
            duration: 0.3,
            opacity: 0,
            y: 20,
            stagger: 0.1,
            ease: 'expo.inOut'
          });

          window.gsap.to([cmsItemResults, filterClearText].filter(Boolean), {
            duration: 0.2,
            opacity: 0,
            ease: 'expo.inOut'
          });
        }
      }

      function openFilterMenu(open) {
        if (!portfolioFilterMenuEl.classList.contains('animating')) {
          portfolioFilterMenuEl.classList.add('animating');
          setMenuSize(open);
          setTimeout(function () { portfolioFilterMenuEl.classList.remove('animating'); }, 400);
        }
        filterHeadWrapEl.classList.toggle('filter-open', open);
      }

      function onClick(e) {
        e.stopPropagation();
        openFilterMenu(!filterHeadWrapEl.classList.contains('filter-open'));
      }

      filterButtonEl.addEventListener('click', onClick);
      destroyers.push(function () { filterButtonEl.removeEventListener('click', onClick); });
    });

    return function destroy() {
      destroyers.forEach(function (fn) { try { fn(); } catch (_) {} });
    };
  }

  // --- Finsweet integration (cmsload/cmsfilter) ---
  function ensureFsPortfolioHooks() {
    WFApp._fsPortfolio = WFApp._fsPortfolio || { installed: false, currentContainer: null };
    if (WFApp._fsPortfolio.installed) return;
    WFApp._fsPortfolio.installed = true;

    window.fsAttributes = window.fsAttributes || [];

    function resetPortfolioItems(root) {
      var items = root.querySelectorAll('.portfolio_cms_item');
      items.forEach(function (item) {
        if (item.dataset.animated === 'true') {
          item.classList.add('cms-item-initial');
        } else {
          item.dataset.animated = 'true';
        }
      });
    }

    function animateCollectionItems(root) {
      if (!window.gsap || !window.PortfolioDecode) return;
      var collectionItems = root.querySelectorAll('.portfolio_cms_item');
      var delayIncrement = 0.075;

      collectionItems.forEach(function (item, index) {
        setTimeout(function () {
          item.classList.remove('cms-item-hidden');
          item.classList.remove('cms-item-initial');
        }, index * delayIncrement * 1000);

        var decLineWrapper = item.querySelector('.layout_line_wrap');
        var lineBg = item.querySelector('.item_line_base');
        var lineFill = item.querySelector('.item_line_inner');
        if (!decLineWrapper || !lineBg || !lineFill) return;

        var decodeDate = item.querySelectorAll('.cms_item_text.is-date');
        var decodeText = item.querySelectorAll('.cms_item_text.is-text');

        var tl = window.gsap.timeline({
          delay: index * delayIncrement,
          defaults: { duration: 0.75, ease: 'power2.out' },
          onComplete: function () { item.classList.remove('cms-item-initial'); }
        });

        decodeDate.forEach(function (el) {
          tl.add(function () {
            window.PortfolioDecode.decodeEffect(el, window.PortfolioDecode.randomCharacterDate, 1700);
          }, 0);
        });

        decodeText.forEach(function (el) {
          tl.add(function () {
            window.PortfolioDecode.decodeEffect(el, window.PortfolioDecode.randomCharacterTag, 1700);
          }, 0);
        });

        tl.fromTo(decLineWrapper, { xPercent: -100 }, { xPercent: 0 }, 0);
        tl.fromTo(lineBg, { xPercent: -100, opacity: 1 }, { xPercent: 0, opacity: 1 }, 0);
        tl.fromTo(lineFill, { xPercent: 0, opacity: 1 }, { xPercent: 150, opacity: 1 }, 0)
          .to(lineFill, { xPercent: -100, opacity: 0 }, '>0');
      });
    }

    function initializePortfolioItems() {
      var root = WFApp._fsPortfolio.currentContainer;
      if (!root) return;

      var items = root.querySelectorAll('.portfolio_cms_item');
      items.forEach(function (item) {
        item.style.visibility = 'visible';
        item.classList.remove('cms-item-hidden');
        if (window.PortfolioDecode) window.PortfolioDecode.addHoverAndClickEffect(item);
      });

      animateCollectionItems(root);
    }

    window.fsAttributes.push([
      'cmsload',
      function (listInstances) {
        if (listInstances && listInstances.length) {
          var listInstance = listInstances[0];
          if (listInstance && listInstance.on) {
            listInstance.on('renderitems', function () {
              var root = WFApp._fsPortfolio.currentContainer;
              if (!root) return;
              resetPortfolioItems(root);
              setTimeout(function () {
                initializePortfolioItems();
              }, 100);
            });
          }
        }

        var root0 = WFApp._fsPortfolio.currentContainer;
        if (root0) {
          resetPortfolioItems(root0);
          setTimeout(function () { initializePortfolioItems(); }, 100);
        }
      }
    ]);

    window.fsAttributes.push([
      'cmsfilter',
      function (filterInstances) {
        var filterInstance = filterInstances && filterInstances[0];
        if (filterInstance && filterInstance.on) {
          filterInstance.on('filter', function () {
            var root = WFApp._fsPortfolio.currentContainer;
            if (!root) return;
            resetPortfolioItems(root);
            setTimeout(function () { initializePortfolioItems(); }, 100);
          });
        }
      }
    ]);
  }

  WFApp.pages.Portfolio = {
    init: function ({ container }) {
      ensurePortfolioDecode();
      ensureFsPortfolioHooks();
      WFApp._fsPortfolio.currentContainer = container;

      // setup filter menu animations + interactions
      var destroyFilter = initPortfolioFilter(container);

      // initial run (in case finsweet already rendered)
      setTimeout(function () {
        var items = container.querySelectorAll('.portfolio_cms_item');
        items.forEach(function (item) {
          item.style.visibility = 'visible';
          item.classList.remove('cms-item-hidden');
          if (window.PortfolioDecode) window.PortfolioDecode.addHoverAndClickEffect(item);
        });
      }, 50);

      return {
        destroy: function () {
          if (destroyFilter) destroyFilter();
          if (WFApp._fsPortfolio) WFApp._fsPortfolio.currentContainer = null;
        }
      };
    }
  };
})();
