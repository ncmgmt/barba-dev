(function () {
  'use strict';

  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  WFApp.pages.Home = {
    init: function ({ container }) {
      // Home page dependencies (Swiper)
      var swiperCss = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';
      var swiperJs = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';

      // timers/instances for cleanup
      var contentTimer = 0;
      var imageSwiper = null;
      var contentSwiper = null;

      function hardHideNameTitle(slide) {
        var n = slide.querySelector('.layout_team_name');
        var t = slide.querySelector('.layout_team_title');
        if (n) { n.style.visibility = 'hidden'; n.style.opacity = '0'; }
        if (t) { t.style.visibility = 'hidden'; t.style.opacity = '0'; }
      }

      function hideNameTitleInAllContentSlides(sw) {
        if (!sw || !sw.slides) return;
        sw.slides.forEach(hardHideNameTitle);
      }

      function fadeMainText(slide) {
        var textEl = slide.querySelector('.layout_team_text');
        if (!textEl) return;
        textEl.style.willChange = 'opacity, transform';
        textEl.style.opacity = '0';
        textEl.style.transform = 'translateY(6px)';
        textEl.style.transition = 'opacity 220ms ease, transform 220ms ease';
        requestAnimationFrame(function () {
          textEl.style.opacity = '1';
          textEl.style.transform = 'translateY(0px)';
        });
      }

      function runNameTitleDecode(slide) {
        if (!window.decodeEffect) return;
        var randomChar = window.randomCharacterDigital || window.randomCharacterTag;
        var nameEl = slide.querySelector('.layout_team_name');
        var titleEl = slide.querySelector('.layout_team_title');

        function run(el) {
          if (!el) return;
          el.style.visibility = 'visible';
          el.style.opacity = '1';
          window.decodeEffect(el, randomChar, 260, false, 'forward', true, null, 1.6, 220);
        }

        if (nameEl) setTimeout(function () { run(nameEl); }, 40);
        if (titleEl) setTimeout(function () { run(titleEl); }, 140);
      }

      function animateContent(sw) {
        var slide = sw && sw.slides ? sw.slides[sw.activeIndex] : null;
        if (!slide) return;
        hardHideNameTitle(slide);
        fadeMainText(slide);
        runNameTitleDecode(slide);
      }

      function scheduleContent(sw) {
        clearTimeout(contentTimer);
        contentTimer = setTimeout(function () { animateContent(sw); }, 90);
      }

      async function initSwipers() {
        // Ensure Swiper is available
        if (WFApp.loadCssOnce) await WFApp.loadCssOnce(swiperCss);
        await WFApp.loadScriptOnce(swiperJs);

        // Guard: page may not have the sliders (fail silently)
        var imageEl = container.querySelector('.swiper.is-image');
        var contentEl = container.querySelector('.swiper.is-content');
        if (!imageEl || !contentEl || !window.Swiper) return;

        imageSwiper = new window.Swiper(imageEl, {
          effect: 'fade',
          fadeEffect: { crossFade: true },
          speed: 380,
          loop: true,
          grabCursor: true,
          keyboard: true,
          followFinger: true,
          allowTouchMove: true,
          navigation: {
            nextEl: container.querySelector('.btn_next_wrap'),
            prevEl: container.querySelector('.btn_previous_wrap')
          },
          pagination: {
            el: container.querySelector('.layout_team_btn_pagination'),
            bulletActiveClass: 'is-active',
            bulletClass: 'swiper-bullet',
            bulletElement: 'button',
            clickable: true
          },
          on: {
            init: function () {
              var slide = this.slides[this.activeIndex];
              if (slide && window.BWBlockReveal) {
                window.BWBlockReveal.coverAndReveal({
                  slideOrContainer: slide,
                  containerSelector: '.layout_team_visual_wrap',
                  imgSelector: '.layout_team_visual_wrap > img.image',
                  holdMs: 210,
                  baseStagger: 3,
                  fadeMs: 80,
                  burstEvery: 18,
                  burstDelay: 10,
                  clusterCount: 6,
                  clusterRadius: 1,
                  blinkMs: 45
                });
              }
            },
            slideChangeTransitionStart: function () {
              var slide = this.slides[this.activeIndex];
              if (slide && window.BWBlockReveal) {
                window.BWBlockReveal.coverAndReveal({
                  slideOrContainer: slide,
                  containerSelector: '.layout_team_visual_wrap',
                  imgSelector: '.layout_team_visual_wrap > img.image',
                  holdMs: 210,
                  baseStagger: 3,
                  fadeMs: 80,
                  burstEvery: 18,
                  burstDelay: 10,
                  clusterCount: 6,
                  clusterRadius: 1,
                  blinkMs: 45
                });
              }
            }
          }
        });

        contentSwiper = new window.Swiper(contentEl, {
          effect: 'fade',
          fadeEffect: { crossFade: true },
          speed: 380,
          loop: true,
          followFinger: false,
          grabCursor: true,
          watchSlidesProgress: true,
          on: {
            init: function () {
              hideNameTitleInAllContentSlides(this);
              scheduleContent(this);
            },
            slideChangeTransitionStart: function () {
              clearTimeout(contentTimer);
              hideNameTitleInAllContentSlides(this);
            },
            slideChangeTransitionEnd: function () {
              scheduleContent(this);
            }
          }
        });

        // Sync
        imageSwiper.controller.control = contentSwiper;
        contentSwiper.controller.control = imageSwiper;
      }

      // Initialize home_v4.js if you still keep it around as a global helper.
      // Important: scripts loaded via Webflow per-page won’t re-run under Barba,
      // so we load them explicitly here if needed.
      async function initHomeV4Optional() {
        // If you migrated home_v4 into this repo later, remove this.
        // await WFApp.loadScriptOnce('https://cdn.jsdelivr.net/gh/blocknc/blockwall/home_v4.js');
      }

      // Start
      (async function () {
        await initHomeV4Optional();
        await initSwipers();
      })();

      return {
        destroy: function () {
          clearTimeout(contentTimer);
          contentTimer = 0;

          if (imageSwiper && typeof imageSwiper.destroy === 'function') {
            try { imageSwiper.destroy(true, true); } catch (_) {}
          }
          if (contentSwiper && typeof contentSwiper.destroy === 'function') {
            try { contentSwiper.destroy(true, true); } catch (_) {}
          }
          imageSwiper = null;
          contentSwiper = null;
        }
      };
    }
  };
})();
