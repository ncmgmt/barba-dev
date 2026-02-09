(function () {
  'use strict';

  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  WFApp.pages.Team = {
    init: function ({ container }) {
      var ctx = null;
      var mm = null;
      var splitInstances = [];
      var listeners = [];
      var st = [];
      var blockRevealHandles = [];

      // Capture readiness token at init-time to avoid late signals resolving a newer navigation.
      var readyToken = 0;
      try { readyToken = (WFApp && WFApp.ready) ? WFApp.ready.token : 0; } catch (_) {}

      var splitTypeUmd = 'https://cdn.jsdelivr.net/npm/split-type@0.3.4/umd/index.min.js';

      function on(el, ev, fn, opts) {
        if (!el || !el.addEventListener) return;
        el.addEventListener(ev, fn, opts);
        listeners.push([el, ev, fn, opts]);
      }

      function qsa(sel, root) {
        return Array.prototype.slice.call((root || container).querySelectorAll(sel));
      }

      function qs(sel, root) {
        return (root || container).querySelector(sel);
      }

      function applyDecodeOnce(el, useBlocks) {
        if (!el) return;
        if (el.dataset.hasAnimated === 'true') {
          el.style.opacity = '1';
          el.style.visibility = 'visible';
          return;
        }

        // Keep compatibility with bw24 behavior: hide until decode begins.
        el.style.opacity = '0';
        el.style.visibility = 'hidden';

        setTimeout(function () {
          if (el.dataset.hasAnimated === 'true') return;
          el.dataset.hasAnimated = 'true';
          el.style.opacity = '1';
          el.style.visibility = 'visible';
          if (window.decodeEffect) {
            var rand = window.randomCharacterTag || window.randomCharacterDigital;
            window.decodeEffect(el, rand, 1700, useBlocks === true, 'forward', true);
          }
        }, 100);
      }

      function initTeam() {
        return (async function () {
          await WFApp.loadScriptOnce(splitTypeUmd);

          if (!window.gsap || !window.ScrollTrigger || !window.SplitType) return;
          try { window.gsap.registerPlugin(window.ScrollTrigger); } catch (_) {}

          ctx = window.gsap.context(function () {
            var gsap = window.gsap;
            var ScrollTrigger = window.ScrollTrigger;

            var cardInfoPositions = gsap.utils.toArray('.card_info_position');

            mm = gsap.matchMedia();

            mm.add({
              isDesktop: '(min-width: 992px)',
              isMobile: '(max-width: 991px)',
              reduceMotion: '(prefers-reduced-motion: reduce)'
            }, function () {
              var teamTitle = qs('[data-ts="title"]');
              var teamText = qs('[data-ts="text"]');

              var teamCards = qsa('[data-ts="card"]');
              var teamCardImgs = qsa('[data-ts="img"]');
              var teamCardInfos = qsa('[data-ts="info"]');
              var teamInfos = qsa('[data-ts="cardInfo"]');
              var teamSocials = qsa('[data-ts="social"]');

              var jobTitle = qs('[data-js="title"]');
              var jobText = qs('[data-js="text"]');
              var jobCards = qsa('[data-js="card"]');

              // Initial hidden state for inner elements
              gsap.set([teamInfos, teamSocials], { opacity: 0, y: 30 });
              gsap.set(teamCardInfos, { opacity: 0, clipPath: 'inset(100% 0 0 0)' });
              gsap.set(cardInfoPositions, { opacity: 0 });

              // Glassmorphism — semi-transparent bg lets block reveal cells show through.
              // color-mix auto-adapts to light/dark theme via --theme--card-bg variable.
              teamCardInfos.forEach(function (info) {
                gsap.set(info, {
                  backgroundImage: 'none',
                  backgroundColor: 'color-mix(in srgb, var(--theme--card-bg) 65%, transparent)',
                  backdropFilter: 'blur(12px) saturate(1.2)',
                  webkitBackdropFilter: 'blur(12px) saturate(1.2)'
                });
              });

              // Title split + reveal
              if (teamTitle) {
                var splitTitle = new window.SplitType(teamTitle, { types: 'words', wordClass: 'word-y' });
                splitInstances.push(splitTitle);
                var titleWords = teamTitle.querySelectorAll('.word-y');
                gsap.set(titleWords, { y: '100%', opacity: 0 });

                st.push(ScrollTrigger.create({
                  trigger: teamTitle,
                  start: 'top 80%',
                  end: 'bottom 20%',
                  scrub: true,
                  toggleActions: 'play none none reverse',
                  preventOverlaps: true,
                  onEnter: function () {
                    gsap.to(titleWords, {
                      y: '0%',
                      opacity: 1,
                      stagger: 0.2,
                      duration: 0.6,
                      ease: 'power4.out'
                    });
                  },
                  onLeaveBack: function (self) {
                    gsap.to(titleWords, {
                      opacity: self.progress,
                      ease: 'power4.out',
                      duration: 0
                    });
                  }
                }));

                // Fade out on scroll-up
                st.push(ScrollTrigger.create({
                  trigger: teamTitle,
                  start: 'clamp(top 5%)',
                  end: 'top 0%',
                  scrub: true,
                  onUpdate: function (self) {
                    gsap.to(teamTitle, { autoAlpha: 1 - self.progress, duration: 0 });
                  }
                }));
              }

              if (teamText) {
                gsap.fromTo(teamText,
                  { clipPath: 'inset(100% 0% 0% 0%)', autoAlpha: 0 },
                  {
                    clipPath: 'inset(0% 0% 0% 0%)',
                    autoAlpha: 1,
                    duration: 0.8,
                    ease: 'power2.out',
                    scrollTrigger: {
                      trigger: teamText,
                      start: 'top 80%',
                      end: 'bottom 50%',
                      toggleActions: 'play none none reverse'
                    }
                  }
                );

                st.push(ScrollTrigger.create({
                  trigger: teamText,
                  start: 'top 5%',
                  end: 'top 0%',
                  scrub: true,
                  onUpdate: function (self) {
                    gsap.to(teamText, { autoAlpha: 1 - self.progress, duration: 0 });
                  }
                }));
              }

              // Job title/text
              if (jobTitle) {
                var splitJobTitle = new window.SplitType(jobTitle, { types: 'words', wordClass: 'word-j' });
                splitInstances.push(splitJobTitle);
                var jobTitleWords = jobTitle.querySelectorAll('.word-j');
                gsap.set(jobTitleWords, { y: '100%', opacity: 0 });

                gsap.to(jobTitleWords, {
                  y: '0%',
                  opacity: 1,
                  stagger: 0.2,
                  duration: 0.6,
                  ease: 'power4.out',
                  scrollTrigger: {
                    trigger: jobTitle,
                    start: 'top 85%',
                    end: 'bottom 55%',
                    toggleActions: 'play none none reverse'
                  }
                });

                st.push(ScrollTrigger.create({
                  trigger: jobTitle,
                  start: 'clamp(top 5%)',
                  end: 'bottom 0%',
                  scrub: true,
                  onUpdate: function (self) {
                    gsap.to(jobTitle, { autoAlpha: 1 - self.progress, duration: 0 });
                  }
                }));
              }

              if (jobText) {
                gsap.fromTo(jobText,
                  { clipPath: 'inset(100% 0% 0% 0%)', autoAlpha: 0 },
                  {
                    clipPath: 'inset(0% 0% 0% 0%)',
                    autoAlpha: 1,
                    duration: 0.8,
                    ease: 'power2.out',
                    scrollTrigger: {
                      trigger: jobText,
                      start: 'top 85%',
                      end: 'bottom 55%',
                      toggleActions: 'play none none reverse'
                    }
                  }
                );

                st.push(ScrollTrigger.create({
                  trigger: jobText,
                  start: 'top 5%',
                  end: 'bottom 0%',
                  scrub: true,
                  onUpdate: function (self) {
                    gsap.to(jobText, { autoAlpha: 1 - self.progress, duration: 0 });
                  }
                }));
              }

              // Job cards
              if (jobCards && jobCards.length) {
                jobCards.forEach(function (card) {
                  gsap.set(card, { autoAlpha: 0, clipPath: 'inset(100% 0% 0% 0%)' });

                  gsap.to(card, {
                    autoAlpha: 1,
                    clipPath: 'inset(0% 0% 0% 0%)',
                    duration: 0.8,
                    ease: 'power2.out',
                    scrollTrigger: {
                      trigger: card,
                      start: 'top 80%',
                      end: 'bottom 50%',
                      toggleActions: 'play none none reverse'
                    }
                  });

                  st.push(ScrollTrigger.create({
                    trigger: card,
                    start: 'top 5%',
                    end: 'bottom 5%',
                    scrub: false,
                    onUpdate: function (self) {
                      gsap.to(card, { autoAlpha: 1 - self.progress, duration: 0 });
                    }
                  }));
                });
              }

              // Team cards: reveal + info + click toggle of cardInfo
              // activeCard tracks { img, info, card } for the currently open card
              var activeCard = null;

              teamCards.forEach(function (card) {
                gsap.set(card, { opacity: 0, clipPath: 'inset(100% 0 0 0)' });
              });

              // Block reveal on both image and info panel.
              // On open: grid covers img + text materializes through dissolving cells.
              // On close: grid covers img, info fades out.
              var blockRevealOpts = {
                px: 28, holdMs: 200, baseStagger: 3, fadeMs: 90,
                burstEvery: 14, burstDelay: 10, clusterCount: 6,
                clusterRadius: 1, blinkMs: 50
              };

              // Tighter grid for text — smaller cells, faster dissolve
              var infoRevealOpts = {
                px: 20, holdMs: 120, baseStagger: 2, fadeMs: 70,
                burstEvery: 10, burstDelay: 8, clusterCount: 4,
                clusterRadius: 1, blinkMs: 40
              };

              function fireBlockReveal(el, opts) {
                if (!window.BWBlockReveal || typeof window.BWBlockReveal.blockReveal !== 'function') return;
                if (getComputedStyle(el).position === 'static') {
                  el.style.position = 'relative';
                }
                var handle = window.BWBlockReveal.blockReveal(el, opts || blockRevealOpts);
                if (handle) blockRevealHandles.push(handle);
              }

              function getListItem(el) {
                try { return el.closest('.team_list_item'); } catch (_) { return null; }
              }

              function openCardInfo(imgEl, infoEl, card) {
                var listItem = getListItem(card);
                if (listItem) listItem.classList.add('active');

                fireBlockReveal(imgEl);

                // Make info visible then block-reveal its content — cells dissolve to
                // materialise the text, matching the site-wide reveal language.
                setTimeout(function () {
                  gsap.set(infoEl, { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' });
                  fireBlockReveal(infoEl, infoRevealOpts);
                }, 80);
              }

              function closeCardInfo(imgEl, infoEl, card) {
                var listItem = getListItem(card);
                if (listItem) listItem.classList.remove('active');

                // Reverse of open: cells cover text, then dissolve with the panel.
                // After hold, panel fades + image block reveal fires to uncover grayscale.
                fireBlockReveal(infoEl, infoRevealOpts);

                setTimeout(function () {
                  gsap.to(infoEl, {
                    opacity: 0,
                    duration: 0.3,
                    ease: 'power2.in',
                    onComplete: function () {
                      gsap.set(infoEl, { clipPath: 'inset(100% 0 0 0)' });
                    }
                  });
                  fireBlockReveal(imgEl);
                }, 120);
              }

              teamCards.forEach(function (card, index) {
                var tl = gsap.timeline({
                  scrollTrigger: {
                    trigger: card,
                    start: 'top 80%',
                    end: 'bottom 20%',
                    toggleActions: 'play none none reverse'
                  }
                });

                tl.fromTo(card,
                  { clipPath: 'inset(100% 0 0 0)', opacity: 0 },
                  { clipPath: 'inset(0% 0 0 0)', opacity: 1, duration: 1, ease: 'power2.out' }
                )
                  .to([teamInfos[index], teamSocials[index]],
                    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
                    '-=0.5'
                  )
                  .add(function () {
                    var pos = teamInfos[index] ? teamInfos[index].querySelector('.card_info_position') : null;
                    if (pos) applyDecodeOnce(pos, false);
                  });

                // Fade-out when card reaches top
                st.push(ScrollTrigger.create({
                  trigger: card,
                  start: 'top 5%',
                  end: 'top 0%',
                  scrub: true,
                  onEnter: function () {
                    gsap.to(card, { opacity: 0, duration: 0.5, ease: 'power2.out' });
                  },
                  onLeaveBack: function () {
                    gsap.to(card, { opacity: 1, duration: 0.5, ease: 'power2.out' });
                  }
                }));

                // Click toggle — block reveal fires on img (covers image area only)
                var img = teamCardImgs[index];
                var info = teamCardInfos[index];
                if (img && info) {
                  on(img, 'click', function () {
                    if (activeCard && activeCard.info !== info) {
                      closeCardInfo(activeCard.img, activeCard.info, activeCard.card);
                    }

                    var op = gsap.getProperty(info, 'opacity');
                    if (Number(op) === 0) {
                      openCardInfo(img, info, card);
                      activeCard = { img: img, info: info, card: card };
                    } else {
                      closeCardInfo(img, info, card);
                      activeCard = null;
                    }
                  });

                  // Close active card when it leaves viewport
                  st.push(ScrollTrigger.create({
                    trigger: card,
                    start: 'bottom bottom',
                    end: 'top top',
                    onLeave: function () {
                      if (activeCard && activeCard.info === info) {
                        closeCardInfo(activeCard.img, activeCard.info, activeCard.card);
                        activeCard = null;
                      }
                    }
                  }));
                }
              });

              // Resize behavior: keep decoded labels visible
              function resetOnResize() {
                cardInfoPositions.forEach(function (position) {
                  if (position && position.dataset.hasAnimated === 'true') {
                    position.style.opacity = '1';
                    position.style.visibility = 'visible';
                  }
                });
              }
              on(window, 'resize', resetOnResize);
            });

          }, container);
        })();
      }

      var started = false;
      function startOnce() {
        if (started) return;
        started = true;
        initTeam();
      }

      window.addEventListener('pageTransitionCompleted', startOnce, { once: true });
      setTimeout(function () { startOnce(); }, 650);

      // Signal to core that initial states are set and the page is ready to animate.
      try {
        if (window.WFApp && window.WFApp.ready && typeof window.WFApp.ready.signal === 'function') window.WFApp.ready.signal(readyToken);
      } catch (_) {}

      return {
        destroy: function () {
          window.removeEventListener('pageTransitionCompleted', startOnce);

          listeners.forEach(function (x) {
            try { x[0].removeEventListener(x[1], x[2], x[3]); } catch (_) {}
          });
          listeners = [];

          // Cleanup block reveal handles before ctx.revert()
          blockRevealHandles.forEach(function (h) {
            try { if (h && h.cleanup) h.cleanup(); } catch (_) {}
          });
          blockRevealHandles = [];

          if (mm) {
            try { mm.kill(); } catch (_) {}
            mm = null;
          }

          st.forEach(function (t) { try { t.kill(); } catch (_) {} });
          st = [];

          try {
            var activeItems = container.querySelectorAll('.team_list_item.active');
            for (var i = 0; i < activeItems.length; i++) activeItems[i].classList.remove('active');
          } catch (_) {}

          if (ctx) {
            try { ctx.revert(); } catch (_) {}
            ctx = null;
          }

          splitInstances.forEach(function (s) { try { s.revert(); } catch (_) {} });
          splitInstances = [];
        }
      };
    }
  };
})();
