(function () {
  'use strict';

  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  WFApp.pages.Home = {
    init: function ({ container }) {
      // ---- deps ----
      var splitTypeUmd = 'https://cdn.jsdelivr.net/npm/split-type@0.3.4/umd/index.min.js';
      var swiperCss = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';
      var swiperJs = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';

      // ---- locals for cleanup ----
      var ctx = null;
      var mm = null;
      var splitInstances = [];
      var st = [];
      var listeners = [];

      var contentTimer = 0;
      var imageSwiper = null;
      var contentSwiper = null;

      function on(el, ev, fn, opts) {
        if (!el || !el.addEventListener) return;
        el.addEventListener(ev, fn, opts);
        listeners.push([el, ev, fn, opts]);
      }

      function qs(sel, root) {
        return (root || container || document).querySelector(sel);
      }

      function qsa(sel, root) {
        return Array.prototype.slice.call((root || container || document).querySelectorAll(sel));
      }

      function safeKillST() {
        if (window.ScrollTrigger && typeof window.ScrollTrigger.getAll === 'function') {
          try { window.ScrollTrigger.getAll().forEach(function (t) { t.kill(); }); } catch (_) {}
        }
      }

      // ---- Home-specific decode effect (ported from bw24/home_v4.js) ----
      // We keep this local to avoid colliding with the global decodeEffect behavior.
      function homeRandomCharacterTag() {
        var chars = '?#*/-_BLOCKWALLabcdefghijklmnopqrstuvwxyz0123456789';
        return chars.charAt(Math.floor(Math.random() * chars.length));
      }

      function textDecodeEffect(el, randomCharFunc, baseDuration, useBlocks, direction, animateReveal, speedChangeFactor) {
        if (!el) return;
        if (useBlocks === void 0) useBlocks = true;
        if (direction === void 0) direction = 'forward';
        if (animateReveal === void 0) animateReveal = false;
        if (speedChangeFactor === void 0) speedChangeFactor = 1.1;

        var originalText = el.dataset.originalText || el.textContent || '';
        el.dataset.originalText = originalText;
        var charDuration = Math.max(baseDuration / Math.max(1, originalText.length), 120);

        el.style.height = 'auto';
        el.style.opacity = '0';

        el.innerHTML = '';

        for (var i = 0; i < originalText.length; i++) {
          var charDecoded = originalText[i];
          var charBox = document.createElement('span');
          charBox.className = 'char-box';
          charBox.style.display = 'inline-block';
          charBox.style.position = 'relative';
          charBox.style.width = 'auto';

          var charSpan = document.createElement('span');
          charSpan.className = 'charDecoded';
          charSpan.innerHTML = animateReveal ? '' : (charDecoded === ' ' ? '&nbsp;' : charDecoded);
          charSpan.style.display = 'inline-block';
          charSpan.style.opacity = '0';

          if (useBlocks) {
            var bgBox = document.createElement('span');
            bgBox.className = 'bg-box';
            bgBox.style.position = 'absolute';
            bgBox.style.top = '0';
            bgBox.style.left = '0';
            bgBox.style.right = '0';
            bgBox.style.bottom = '0';
            bgBox.style.width = '100%';
            bgBox.style.height = '100%';
            bgBox.style.background = 'var(--block-decode--background)';
            bgBox.style.zIndex = '1';
            bgBox.style.opacity = '0';
            charBox.appendChild(bgBox);
          }

          charBox.appendChild(charSpan);
          el.appendChild(charBox);
        }

        // Cursor
        var cursorBox = document.createElement('span');
        cursorBox.className = 'char-box cursor-box';
        cursorBox.style.display = 'inline-block';
        cursorBox.style.position = 'relative';
        cursorBox.style.width = 'auto';

        var cursorSpan = document.createElement('span');
        cursorSpan.className = 'charDecoded';
        cursorSpan.innerHTML = '_';
        cursorSpan.style.display = 'inline-block';
        cursorSpan.style.opacity = '0';

        if (useBlocks) {
          var bgBoxC = document.createElement('span');
          bgBoxC.className = 'bg-box';
          bgBoxC.style.position = 'absolute';
          bgBoxC.style.top = '0';
          bgBoxC.style.left = '0';
          bgBoxC.style.right = '0';
          bgBoxC.style.bottom = '0';
          bgBoxC.style.width = '100%';
          bgBoxC.style.height = '100%';
          bgBoxC.style.background = 'var(--block-decode--background)';
          bgBoxC.style.zIndex = '1';
          bgBoxC.style.opacity = '0';
          cursorBox.appendChild(bgBoxC);
        }

        cursorBox.appendChild(cursorSpan);
        el.appendChild(cursorBox);

        var charBoxes = Array.prototype.slice.call(el.children);
        el.style.display = 'inline-block';
        el.style.whiteSpace = 'pre-wrap';
        el.style.wordBreak = 'break-word';

        if (animateReveal) {
          charBoxes.forEach(function (box) { box.style.opacity = '0'; });
        }

        if (window.gsap) {
          window.gsap.to(el, { opacity: 1, duration: 0.2 });
        } else {
          el.style.opacity = '1';
        }

        function updateCharBox(index, speedFactor) {
          if (index >= charBoxes.length - 1) {
            el.dataset.animating = 'false';

            // cursor blink
            var cursorBg = charBoxes[charBoxes.length - 1].querySelector('.bg-box');
            var cursorChar = charBoxes[charBoxes.length - 1].querySelector('.charDecoded');
            if (window.gsap && cursorBg && cursorChar) {
              window.gsap.to(cursorBg, { opacity: 1, duration: 0.4, repeat: -1, yoyo: true, ease: 'power2.inOut' });
              window.gsap.to(cursorChar, { opacity: 1, duration: 0.4, repeat: -1, yoyo: true, ease: 'power2.inOut' });
            }
            return;
          }

          var box = charBoxes[index];
          var span = box.querySelector('.charDecoded');
          var bg = box.querySelector('.bg-box');

          var effective = charDuration / speedFactor;
          var start = Date.now();

          function tick() {
            var elapsed = Date.now() - start;
            var progress = Math.min(elapsed / effective, 1);

            if (progress < 1) {
              if (span) {
                try { span.textContent = randomCharFunc(); } catch (_) {}
                span.style.opacity = '1';
              }
              if (animateReveal && progress > 0) box.style.opacity = '1';
              if (bg) bg.style.opacity = String(progress);
              requestAnimationFrame(tick);
            } else {
              if (span) {
                var finalChar = originalText[index];
                span.innerHTML = finalChar === ' ' ? '&nbsp;' : finalChar;
                span.style.opacity = '1';
              }
              if (bg) bg.style.opacity = '0';

              updateCharBox(direction === 'reverse' ? index - 1 : index + 1, speedFactor * speedChangeFactor);
            }
          }

          requestAnimationFrame(tick);
        }

        updateCharBox(direction === 'reverse' ? charBoxes.length - 2 : 0, 1);
      }

      // ---- Swiper logic (already in barba-dev Home.js) ----
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
        var randomChar = window.randomCharacterDigital || window.randomCharacterTag;
        var nameEl = slide.querySelector('.layout_team_name');
        var titleEl = slide.querySelector('.layout_team_title');

        function run(el) {
          if (!el || !window.decodeEffect) return;
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
        if (WFApp.loadCssOnce) await WFApp.loadCssOnce(swiperCss);
        await WFApp.loadScriptOnce(swiperJs);

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

        imageSwiper.controller.control = contentSwiper;
        contentSwiper.controller.control = imageSwiper;
      }

      // ---- GSAP home animations (ported from bw24/home_v4.js) ----
      async function initHomeAnimations() {
        await WFApp.loadScriptOnce(splitTypeUmd);

        if (!window.gsap || !window.ScrollTrigger || !window.SplitType) return;
        try { window.gsap.registerPlugin(window.ScrollTrigger); } catch (_) {}

        // Some elements are optional; we guard aggressively.
        var heroSection = qs('[data-section="hero"]');
        var featureSection = qs('[data-section="feature"]');
        var portfolioSection = qs('.layout_ppreview_wrap');

        if (!heroSection || !featureSection || !portfolioSection) return;

        // SplitType instances
        var heroTitle = qs('[data-hero="title"]');
        var featureTitle = qs('[data-feature="title"]');
        var portfolioTitle = qs('[data-portfolio="title"]');

        if (heroTitle) splitInstances.push(new window.SplitType(heroTitle, { types: 'words, lines', wordClass: 'hword', lineClass: 'hline' }));
        if (featureTitle) splitInstances.push(new window.SplitType(featureTitle, { types: 'words, lines', wordClass: 'fword', lineClass: 'fline' }));
        if (portfolioTitle) splitInstances.push(new window.SplitType(portfolioTitle, { types: 'words, lines', wordClass: 'pword', lineClass: 'pline' }));

        // Scope everything to this container
        ctx = window.gsap.context(function () {
          mm = window.gsap.matchMedia();

          mm.add({
            isMobile: '(max-width: 992px)',
            isTablet: '(min-width: 993px) and (max-width: 1024px)',
            isDesktop: '(min-width: 1025px)',
            reduceMotion: '(prefers-reduced-motion: reduce)'
          }, function (context) {
            var cond = context.conditions || {};

            var heroSubtitle = qs('[data-hero="subtitle"]');
            var heroText = qs('[data-hero="text"]');
            var heroBtn = qs('[data-hero="btn"]');
            var heroImg = qs('[data-hero="img"]');

            var featureItems = qsa('[data-feature="item"]');

            var portfolioText = qs('[data-portfolio="text"]');
            var portfolioBtn = qs('[data-portfolio="btn"]');
            var portfolioItems = qsa('.layout_ppreview_item');

            var teamImg = qs('[data-team="left"]');
            var teamContent = qs('[data-team="right"]');

            if (cond.reduceMotion) {
              // Disable animations in reduced motion
              window.gsap.set([heroTitle, heroSubtitle, heroText, heroBtn, heroImg], { opacity: 1, y: 0 });
              window.gsap.set(featureItems, { opacity: 1, y: 0 });
              window.gsap.set([portfolioItems, portfolioTitle, portfolioText, portfolioBtn], { opacity: 1, y: 0 });
              window.gsap.set([teamImg, teamContent], { opacity: 1, y: 0, visibility: 'visible' });
              return;
            }

            // Desktop hero entrance: run after transition completes (same as bw24)
            if (cond.isDesktop) {
              function runHeroIntro() {
                if (!heroSection) return;

                var heroWords = heroSection.querySelectorAll('.hword');
                var tl = window.gsap.timeline({
                  onComplete: function () {
                    try { window.ScrollTrigger.refresh(); } catch (_) {}
                  }
                });

                if (heroWords && heroWords.length) {
                  tl.set(heroWords, { y: '100%', opacity: 0 })
                    .to(heroWords, { y: '0%', opacity: 1, stagger: 0.2, duration: 0.5, ease: 'power4.out' });
                }

                if (heroImg) {
                  tl.fromTo(heroImg, { opacity: 0, scale: 0.7, x: '+5%' }, {
                    opacity: 1, scale: 1, x: '0%', duration: 1.75, ease: 'power2.out'
                  }, 0);
                }

                if (heroSubtitle) {
                  tl.to(heroSubtitle, {
                    autoAlpha: 1,
                    duration: 0.2,
                    onStart: function () {
                      textDecodeEffect(heroSubtitle, homeRandomCharacterTag, 100, true, 'forward', false, 1.025);
                    }
                  }, 0);
                }

                if (heroText) {
                  tl.fromTo(heroText, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '<');
                }
                if (heroBtn) {
                  tl.fromTo(heroBtn, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '<0.1');
                }
              }

              // Use the compatibility event emitted by core.js
              var once = false;
              function onTransition() {
                if (once) return;
                once = true;
                runHeroIntro();
              }
              window.addEventListener('pageTransitionCompleted', onTransition, { once: true });

              // In case event already fired (e.g. fast nav), fallback
              setTimeout(function () {
                if (!once) onTransition();
              }, 700);

              // Hero fade lines
              var heroLines = heroSection.querySelectorAll('.hline');
              heroLines.forEach(function (line) {
                st.push(window.ScrollTrigger.create({
                  trigger: line,
                  start: 'clamp(top 80%)',
                  end: 'top 5%',
                  scrub: true,
                  onUpdate: function (self) {
                    window.gsap.to(line, { opacity: 1 - self.progress, duration: 0 });
                  }
                }));
              });

              // Hero img drift
              if (heroImg) {
                st.push(window.ScrollTrigger.create({
                  trigger: heroSection,
                  start: 'top +=15%',
                  end: 'bottom -=20%',
                  scrub: false,
                  toggleActions: 'play none none reverse',
                  onUpdate: function (self) {
                    window.gsap.to(heroImg, {
                      x: self.progress * 200,
                      opacity: 1 - self.progress,
                      duration: 0,
                      scale: 1 - self.progress * 0.2
                    });
                  }
                }));
              }
            }

            // Always keep ST fresh
            setTimeout(function () {
              try { window.ScrollTrigger.refresh(); } catch (_) {}
            }, 900);
          });

        }, container);
      }

      // ---- Start ----
      (async function () {
        await initHomeAnimations();
        await initSwipers();
      })();

      return {
        destroy: function () {
          // listeners
          listeners.forEach(function (x) {
            try { x[0].removeEventListener(x[1], x[2], x[3]); } catch (_) {}
          });
          listeners = [];

          // swipers
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

          // gsap
          if (mm) {
            try { mm.kill(); } catch (_) {}
            mm = null;
          }
          st.forEach(function (t) { try { t.kill(); } catch (_) {} });
          st = [];

          if (ctx) {
            try { ctx.revert(); } catch (_) {}
            ctx = null;
          }

          splitInstances.forEach(function (s) { try { s.revert(); } catch (_) {} });
          splitInstances = [];

          // Safety: kill any straggler triggers
          safeKillST();
        }
      };
    }
  };
})();
