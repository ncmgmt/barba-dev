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

        if (window.gsap) window.gsap.to(el, { opacity: 1, duration: 0.2 });
        else el.style.opacity = '1';

        function updateCharBox(index, speedFactor) {
          if (index >= charBoxes.length - 1) {
            el.dataset.animating = 'false';

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

      // ---- Swiper logic (Team slider on home) ----
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

        var heroSection = qs('[data-section="hero"]');
        var featureSection = qs('[data-section="feature"]');
        var portfolioSection = qs('.layout_ppreview_wrap');
        var teamSection = qs('.layout_team_wrap');

        if (!heroSection || !featureSection || !portfolioSection) return;

        var heroTitle = qs('[data-hero="title"]');
        var featureTitle = qs('[data-feature="title"]');
        var portfolioTitle = qs('[data-portfolio="title"]');

        if (heroTitle) splitInstances.push(new window.SplitType(heroTitle, { types: 'words, lines', wordClass: 'hword', lineClass: 'hline' }));
        if (featureTitle) splitInstances.push(new window.SplitType(featureTitle, { types: 'words, lines', wordClass: 'fword', lineClass: 'fline' }));
        if (portfolioTitle) splitInstances.push(new window.SplitType(portfolioTitle, { types: 'words, lines', wordClass: 'pword', lineClass: 'pline' }));

        ctx = window.gsap.context(function () {
          var gsap = window.gsap;
          var ScrollTrigger = window.ScrollTrigger;

          mm = gsap.matchMedia();

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
            var portfolioImg = qs('[data-ps="img"]');

            var teamImg = qs('[data-team="left"]');
            var teamContent = qs('[data-team="right"]');

            // Ellipse entrance + drift
            var ellipseHome = qs('[data-ellipse="home"]');
            var contentWrap = qs('.content_wrap');
            if (ellipseHome && contentWrap) {
              var tlEllipse = gsap.timeline({
                scrollTrigger: {
                  trigger: heroSection,
                  start: 'top 80%',
                  end: 'bottom top',
                  scrub: false
                }
              });
              tlEllipse.to(ellipseHome, { opacity: 1, x: '0%', duration: 3, ease: 'power2.inOut' });
              tlEllipse.to(ellipseHome, {
                x: '-25%',
                duration: 2,
                ease: 'power1.inOut',
                scrollTrigger: {
                  trigger: contentWrap,
                  start: 'top center',
                  end: 'bottom top',
                  scrub: true
                }
              });
            }

            if (cond.reduceMotion) {
              gsap.set([heroTitle, heroSubtitle, heroText, heroBtn, heroImg], { opacity: 1, y: 0, x: 0, scale: 1 });
              gsap.set(featureItems, { opacity: 1, y: 0 });
              gsap.set([portfolioItems, portfolioTitle, portfolioText, portfolioBtn, portfolioImg], { opacity: 1, y: 0, x: 0, scale: 1, clipPath: 'none' });
              gsap.set([teamImg, teamContent], { opacity: 1, y: 0, clipPath: 'none', visibility: 'visible' });
              return;
            }

            // ---- Hero intro (Desktop/Mobile/Tablet) ----
            function runHeroIntro() {
              var heroWords = heroSection.querySelectorAll('.hword');
              var tl = gsap.timeline({ onComplete: function () { try { ScrollTrigger.refresh(); } catch (_) {} } });

              if (heroWords && heroWords.length) {
                tl.set(heroWords, { y: '100%', opacity: 0 })
                  .to(heroWords, { y: '0%', opacity: 1, stagger: 0.2, duration: 0.5, ease: 'power4.out' });
              }

              if (heroImg) {
                if (cond.isDesktop) {
                  tl.fromTo(heroImg, { opacity: 0, scale: 0.7, x: '+5%' }, { opacity: 1, scale: 1, x: '0%', duration: 1.75, ease: 'power2.out' }, 0);
                } else if (cond.isMobile) {
                  tl.fromTo(heroImg, { opacity: 0, x: '+5%' }, { opacity: 1, x: '0%', duration: 1.75, ease: 'power2.out' }, 0);
                } else {
                  tl.fromTo(heroImg, { opacity: 0 }, { opacity: 1, duration: 1.25, ease: 'power2.out' }, 0);
                }
              }

              if (heroSubtitle) {
                tl.to(heroSubtitle, {
                  autoAlpha: 1,
                  duration: cond.isTablet ? 0.4 : 0.2,
                  onStart: function () {
                    // only decode on non-tablet (matching bw24 comment)
                    if (!cond.isTablet) {
                      textDecodeEffect(heroSubtitle, homeRandomCharacterTag, 100, true, 'forward', false, 1.025);
                    }
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

            var heroOnce = false;
            function onTransition() {
              if (heroOnce) return;
              heroOnce = true;
              runHeroIntro();
            }
            window.addEventListener('pageTransitionCompleted', onTransition, { once: true });
            setTimeout(function () { if (!heroOnce) onTransition(); }, 700);

            // ---- Hero fadeouts/drift ----
            var heroLines = heroSection.querySelectorAll('.hline');
            heroLines.forEach(function (line) {
              st.push(ScrollTrigger.create({
                trigger: line,
                start: cond.isMobile ? 'clamp(top 10%)' : 'clamp(top 80%)',
                end: 'top 5%',
                scrub: true,
                onUpdate: function (self) {
                  gsap.to(line, { opacity: 1 - self.progress, duration: 0 });
                }
              }));
            });

            if (heroSection && heroImg) {
              st.push(ScrollTrigger.create({
                trigger: heroSection,
                start: 'top +=15%',
                end: 'bottom -=20%',
                scrub: false,
                toggleActions: 'play none none reverse',
                onUpdate: function (self) {
                  var cfg = { x: self.progress * 200, opacity: 1 - self.progress, duration: 0 };
                  if (cond.isDesktop) cfg.scale = 1 - self.progress * 0.2;
                  gsap.to(heroImg, cfg);
                }
              }));
            }

            // separate fade outs for subtitle/text/button
            if (heroSubtitle) {
              st.push(ScrollTrigger.create({
                trigger: heroSubtitle,
                start: cond.isDesktop ? 'top 15%' : 'top 20%',
                end: 'top 5%',
                scrub: false,
                toggleActions: 'play none none reverse',
                onUpdate: function (self) { gsap.to(heroSubtitle, { opacity: 1 - self.progress, duration: 0 }); }
              }));
            }
            if (heroText) {
              st.push(ScrollTrigger.create({
                trigger: heroText,
                start: cond.isDesktop ? 'top 15%' : 'top 20%',
                end: 'top 5%',
                scrub: false,
                toggleActions: 'play none none reverse',
                onUpdate: function (self) { gsap.to(heroText, { opacity: 1 - self.progress, duration: 0 }); }
              }));
            }
            if (heroBtn) {
              st.push(ScrollTrigger.create({
                trigger: heroBtn,
                start: cond.isDesktop ? 'top 80%' : 'top 20%',
                end: cond.isDesktop ? 'top 43%' : 'top 5%',
                scrub: false,
                toggleActions: 'play none none reverse',
                onUpdate: function (self) { gsap.to(heroBtn, { opacity: 1 - self.progress, duration: 0 }); }
              }));
            }

            // ---- Feature section ----
            if (featureSection && featureTitle) {
              var featureTimeline = gsap.timeline({
                scrollTrigger: {
                  trigger: featureSection,
                  start: cond.isMobile ? 'top 70%' : 'top center',
                  end: cond.isDesktop ? 'top top' : 'top top',
                  toggleActions: cond.isMobile ? 'play complete none none' : 'play complete none reset'
                }
              });

              var featureWords = featureSection.querySelectorAll('.fword');
              gsap.set(featureWords, { opacity: 0 });
              featureTimeline
                .set(featureWords, { y: '100%', opacity: 0 })
                .to(featureWords, { y: '0%', opacity: 1, stagger: 0.2, duration: 0.6, ease: 'power4.out' });

              featureItems.forEach(function (item, index) {
                var svg = qs('[data-card="svg"]', item);
                var title = qs('[data-card="title"]', item);
                var text = qs('[data-card="text"]', item);
                var line = qs('[data-card="line"]', item);

                var itemTl = gsap.timeline();
                if (svg) {
                  itemTl.fromTo(svg, { autoAlpha: 0, y: cond.isMobile ? 0 : 20 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.inOut' });
                }
                if (line) {
                  itemTl.fromTo(line, { autoAlpha: 0, width: '0%' }, { autoAlpha: 1, width: '100%', duration: 0.5, ease: 'power2.inOut' }, '<');
                }
                if (title) {
                  itemTl.fromTo(title, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: cond.isMobile ? 0.3 : 0.4, ease: 'sine.inOut' }, '<');
                }
                if (text) {
                  itemTl.fromTo(text, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: cond.isMobile ? 0.4 : 0.4, ease: 'power2.out' }, '<');
                }
                featureTimeline.add(itemTl, index * 0.35);

                // fade out
                st.push(ScrollTrigger.create({
                  trigger: item,
                  start: 'top 15%',
                  end: 'top 5%',
                  scrub: true,
                  onUpdate: function (self) {
                    gsap.to([svg, title, text, line].filter(Boolean), { autoAlpha: 1 - self.progress, duration: 0 });
                  }
                }));
              });

              st.push(ScrollTrigger.create({
                trigger: featureTitle,
                start: 'top 10%',
                end: 'bottom 5%',
                scrub: true,
                onUpdate: function (self) {
                  gsap.to(featureTitle, { autoAlpha: 1 - self.progress, duration: 0 });
                }
              }));
            }

            // ---- Portfolio section ----
            if (portfolioSection) {
              if (portfolioImg) {
                gsap.fromTo(portfolioImg,
                  { autoAlpha: 0, x: '20%', y: cond.isDesktop ? '0%' : undefined },
                  {
                    autoAlpha: 1,
                    duration: 1.5,
                    x: cond.isMobile ? '10%' : '0%',
                    y: '0%',
                    ease: 'power1.inOut',
                    scrollTrigger: {
                      trigger: portfolioSection,
                      start: 'top center',
                      end: '+=80%',
                      scrub: false,
                      toggleActions: 'play none none reverse'
                    }
                  }
                );
              }

              // Illu contain fades/drifts (if exists)
              var illu = qs('.layout_illu_contain');
              if (illu) {
                gsap.to(illu, {
                  opacity: 0,
                  scrollTrigger: {
                    trigger: portfolioSection,
                    start: 'bottom bottom',
                    end: '+=50%',
                    scrub: 0.8
                  }
                });

                if (cond.isDesktop) {
                  gsap.to(illu, {
                    y: '-10%',
                    x: '2%',
                    ease: 'power2.inOut',
                    scrollTrigger: {
                      trigger: portfolioSection,
                      start: 'top top',
                      end: '+=100%',
                      scrub: 0.8
                    }
                  });
                }
              }

              // Title/words and text/button
              var pWords = portfolioSection.querySelectorAll('.pword');
              if (pWords && pWords.length && portfolioTitle) {
                var pTl = gsap.timeline({
                  scrollTrigger: {
                    trigger: portfolioSection,
                    start: 'top 85%',
                    end: 'bottom 80%',
                    toggleActions: 'play none none reverse'
                  }
                });

                pTl
                  .set(pWords, { y: '100%', opacity: 0 })
                  .to(pWords, { y: '0%', opacity: 1, stagger: 0.2, duration: 0.6, ease: 'power4.out' });

                if (portfolioText) {
                  pTl.fromTo(portfolioText, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6');
                }
                if (portfolioBtn) {
                  pTl.fromTo(portfolioBtn, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, '<');
                }
              }

              // Gradient animation
              var gradient = qs('.design_gradient_wrap');
              if (gradient) {
                gsap.set(gradient, { x: cond.isDesktop ? '-40%' : '-20%', y: cond.isDesktop ? '-20%' : undefined, opacity: 0 });

                gsap.to(gradient, {
                  x: '0%',
                  y: cond.isDesktop ? '40%' : undefined,
                  opacity: 0.65,
                  ease: 'power2.inOut',
                  scrollTrigger: {
                    trigger: featureSection,
                    start: 'top center',
                    end: 'bottom bottom',
                    scrub: true,
                    toggleActions: 'play none none reverse',
                    onLeave: function () {
                      gsap.to(gradient, {
                        x: '-10%',
                        y: cond.isDesktop ? '40%' : undefined,
                        opacity: 0.4,
                        ease: 'power2.inOut',
                        scrollTrigger: {
                          trigger: featureSection,
                          start: 'bottom bottom',
                          end: 'bottom top',
                          scrub: true,
                          toggleActions: 'play none none reverse'
                        }
                      });
                    }
                  }
                });
              }

              // Item configs for desktop float
              var itemConfigs = [
                { startY: 0, endY: 190 },
                { startY: 0, endY: 150 },
                { startY: 0, endY: 250 },
                { startY: 0, endY: 150 },
                { startY: 0, endY: 150 }
              ];

              portfolioItems.forEach(function (item, index) {
                var svg = qs('[data-pf="img"]', item);
                var logo = qs('[data-pf="logo"]', item);
                var title = qs('[data-pf="name"]', item);
                var text = qs('[data-pf="text"]', item);

                gsap.set([svg, logo, title, text].filter(Boolean), { autoAlpha: 0 });

                if (cond.isDesktop && itemConfigs[index]) {
                  var cfg = itemConfigs[index];
                  gsap.fromTo(item, { y: cfg.startY }, {
                    y: cfg.endY,
                    duration: gsap.utils.random(1.5, 2.5),
                    ease: gsap.utils.random(['power1.inOut', 'sine.inOut']),
                    scrollTrigger: {
                      trigger: item,
                      start: 'top 90%',
                      end: 'bottom 70%',
                      scrub: gsap.utils.random(2, 4)
                    }
                  });
                }

                var tline = gsap.timeline({
                  scrollTrigger: {
                    trigger: item,
                    start: cond.isDesktop ? 'top 80%' : 'top 95%',
                    end: cond.isDesktop ? 'bottom 90%' : 'bottom bottom',
                    scrub: cond.isDesktop ? 1 : 0.1,
                    toggleActions: cond.isDesktop ? 'play complete none reverse' : 'play none none reverse'
                  }
                });

                if (svg) {
                  if (cond.isDesktop) {
                    tline.fromTo(svg, { clipPath: 'inset(100% 0% 0% 0%)', autoAlpha: 0, scale: 0.85 }, { clipPath: 'inset(0% 0% 0% 0%)', autoAlpha: 1, duration: 1.25, scale: 1, ease: 'power2.inOut' });
                  } else {
                    tline.fromTo(svg, { clipPath: 'none', y: 20, opacity: 0 }, { clipPath: 'none', y: 0, opacity: 1, duration: 1, ease: 'power2.inOut' });
                  }
                }
                if (logo) {
                  tline.fromTo(logo, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1, ease: 'power2.inOut' }, '<');
                }
                if (title) {
                  tline.fromTo(title, { autoAlpha: 0 }, {
                    autoAlpha: 1,
                    ease: 'power1.inOut',
                    onStart: function () {
                      if (cond.isDesktop) {
                        textDecodeEffect(title, homeRandomCharacterTag, 100, true, 'forward', false, 1.05);
                      }
                    }
                  }, cond.isDesktop ? '<' : '-=0.5');
                }
                if (text) {
                  tline.fromTo(text, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, cond.isDesktop ? '-=0.3' : '-=0.3');
                }

                // Fade out each element as it approaches top
                [svg, logo, title, text].filter(Boolean).forEach(function (el) {
                  st.push(ScrollTrigger.create({
                    trigger: el,
                    start: cond.isDesktop ? 'top 5%' : 'top 15%',
                    end: cond.isDesktop ? 'bottom top+=25' : 'bottom 15%',
                    scrub: true,
                    onUpdate: function (self) {
                      var cfg2 = { autoAlpha: 1 - self.progress, duration: 0 };
                      if (cond.isDesktop) cfg2.scale = 1 - self.progress * 0.05;
                      gsap.to(el, cfg2);
                    }
                  }));
                });
              });

              // fade out title/text/button around items
              if (portfolioTitle && portfolioItems.length) {
                st.push(ScrollTrigger.create({
                  trigger: portfolioItems,
                  start: 'top top+=30%',
                  end: 'top top+=10%',
                  scrub: true,
                  onUpdate: function (self) { gsap.to(portfolioTitle, { autoAlpha: 1 - self.progress, duration: 0 }); }
                }));
              }
              if (portfolioText && portfolioItems.length) {
                st.push(ScrollTrigger.create({
                  trigger: portfolioItems,
                  start: 'top top+=35%',
                  end: 'top top+=10%',
                  scrub: true,
                  onUpdate: function (self) { gsap.to(portfolioText, { autoAlpha: 1 - self.progress, duration: 0 }); }
                }));
              }
              if (portfolioBtn && portfolioItems.length) {
                st.push(ScrollTrigger.create({
                  trigger: portfolioItems,
                  start: 'top top+=40%',
                  end: 'top top+=10%',
                  scrub: true,
                  onUpdate: function (self) { gsap.to(portfolioBtn, { autoAlpha: 1 - self.progress, duration: 0 }); }
                }));
              }
            }

            // ---- Team section reveal ----
            if (teamSection && teamImg && teamContent) {
              if (cond.isDesktop) {
                gsap.set([teamImg, teamContent], { opacity: 0, clipPath: 'inset(100% 0% 0% 0%)', visibility: 'visible' });
              } else {
                gsap.set([teamImg, teamContent], { opacity: 0, clipPath: 'none', visibility: 'visible' });
              }

              st.push(ScrollTrigger.create({
                trigger: teamSection,
                start: 'top 40%',
                end: 'top 80%',
                scrub: true,
                toggleActions: 'play none none reverse',
                onEnter: function () {
                  if (cond.isDesktop) {
                    gsap.fromTo(teamImg, { clipPath: 'inset(100% 0% 0% 0%)', opacity: 0 }, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 0.8, ease: 'sine.inOut', immediateRender: false });
                    gsap.fromTo(teamContent, { clipPath: 'inset(100% 0% 0% 0%)', opacity: 0 }, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 0.8, delay: 0.1, ease: 'sine.inOut', immediateRender: false });
                  } else {
                    gsap.fromTo(teamImg, { clipPath: 'none', y: 40, opacity: 0 }, { clipPath: 'none', y: 0, opacity: 1, duration: 0.8, ease: 'sine.inOut', immediateRender: false });
                    gsap.fromTo(teamContent, { clipPath: 'none', y: 40, opacity: 0 }, { clipPath: 'none', y: 0, opacity: 1, duration: 0.8, delay: 0.1, ease: 'sine.inOut', immediateRender: false });
                  }
                },
                onLeaveBack: function () {
                  gsap.to([teamImg, teamContent], { opacity: 0, clipPath: cond.isDesktop ? 'inset(100% 0% 0% 0%)' : 'none', ease: 'sine.inOut', duration: 0.8 });
                }
              }));
            }

            setTimeout(function () { try { ScrollTrigger.refresh(); } catch (_) {} }, 900);
          });

        }, container);
      }

      // ---- Start ----
      (async function () {
        var readyToken = 0;
        try { readyToken = (window.WFApp && window.WFApp.ready) ? window.WFApp.ready.token : 0; } catch (_) {}

        await initHomeAnimations();
        await initSwipers();

        // Signal to core that initial states are set and the page is ready to animate.
        try {
          if (window.WFApp && window.WFApp.ready && typeof window.WFApp.ready.signal === 'function') {
            window.WFApp.ready.signal(readyToken);
          }
        } catch (_) {}
      })();

      return {
        destroy: function () {
          listeners.forEach(function (x) {
            try { x[0].removeEventListener(x[1], x[2], x[3]); } catch (_) {}
          });
          listeners = [];

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

          // NOTE: Do NOT call safeKillST() here.
          // safeKillST() kills ALL ScrollTriggers globally, including nav triggers
          // from global.js. Killing nav triggers while the nav is hidden (y:-100%)
          // leaves it stuck invisible. Home's triggers are already cleaned up by
          // st.forEach, ctx.revert, and mm.kill above.
        }
      };
    }
  };
})();
