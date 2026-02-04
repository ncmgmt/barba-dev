(function () {
  'use strict';

  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  WFApp.pages.Team = {
    init: function ({ container }) {
      var ctx = null;
      var mm = null;
      var splitInstances = [];

      // Load SplitType (UMD) because bw24 version imported it as module
      var splitTypeUmd = 'https://cdn.jsdelivr.net/npm/split-type@0.3.4/umd/index.min.js';

      function qsa(sel) { return Array.prototype.slice.call(container.querySelectorAll(sel)); }
      function qs(sel) { return container.querySelector(sel); }

      async function initTeam() {
        await WFApp.loadScriptOnce(splitTypeUmd);

        if (!window.gsap || !window.ScrollTrigger || !window.SplitType) return;

        ctx = window.gsap.context(function () {
          // This is a reduced/Barba-safe adaptation of bw24/gsap_team_new.js.
          // Original relied on window 'pageTransitionCompleted'. We already emit that event in core.

          var cardInfoPositions = window.gsap.utils.toArray('.card_info_position');
          mm = window.gsap.matchMedia();

          mm.add({
            isDesktop: '(min-width: 992px)',
            isMobile: '(max-width: 991px)'
          }, function () {
            var teamTitle = qs('[data-ts="title"]');
            var teamText = qs('[data-ts="text"]');
            var jobTitle = qs('[data-js="title"]');
            var jobText = qs('[data-js="text"]');

            if (!teamTitle || !teamText) return;

            // Split titles
            var splitTitle = new window.SplitType(teamTitle, { types: 'words', wordClass: 'word-y' });
            splitInstances.push(splitTitle);
            var titleWords = teamTitle.querySelectorAll('.word-y');
            window.gsap.set(titleWords, { y: '100%', opacity: 0 });

            window.ScrollTrigger.create({
              trigger: teamTitle,
              start: 'top 80%',
              end: 'bottom 20%',
              scrub: true,
              toggleActions: 'play none none reverse',
              onEnter: function () {
                window.gsap.to(titleWords, {
                  y: '0%',
                  opacity: 1,
                  stagger: 0.2,
                  duration: 0.6,
                  ease: 'power4.out'
                });
              },
              onLeaveBack: function (self) {
                window.gsap.to(teamTitle, { autoAlpha: self.progress, duration: 0 });
              }
            });

            window.gsap.fromTo(teamText,
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

            // Job section (optional)
            if (jobTitle && jobText) {
              var splitJobTitle = new window.SplitType(jobTitle, { types: 'words', wordClass: 'word-j' });
              splitInstances.push(splitJobTitle);
              var jobTitleWords = jobTitle.querySelectorAll('.word-j');
              window.gsap.set(jobTitleWords, { y: '100%', opacity: 0 });
              window.gsap.to(jobTitleWords, {
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

              window.gsap.fromTo(jobText,
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
            }

            // Initial hidden states that exist in bw24
            var teamInfos = qsa('[data-ts="cardInfo"]');
            var teamSocials = qsa('[data-ts="social"]');
            var teamCardInfos = qsa('[data-ts="info"]');

            window.gsap.set([teamInfos, teamSocials], { opacity: 0, y: 30 });
            window.gsap.set(teamCardInfos, { opacity: 0, clipPath: 'inset(100% 0 0 0)' });
            window.gsap.set(cardInfoPositions, { opacity: 0 });
          });

        }, container);
      }

      // Start after transition event (keeps same behavior as before)
      function onTransitionDone() {
        initTeam();
      }
      window.addEventListener('pageTransitionCompleted', onTransitionDone, { once: true });

      // Fallback if event already happened
      setTimeout(function () {
        if (!ctx) initTeam();
      }, 600);

      return {
        destroy: function () {
          window.removeEventListener('pageTransitionCompleted', onTransitionDone);
          if (mm) {
            try { mm.kill(); } catch (_) {}
            mm = null;
          }
          if (ctx) {
            try { ctx.revert(); } catch (_) {}
            ctx = null;
          }
          // SplitType cleanup
          splitInstances.forEach(function (s) { try { s.revert(); } catch (_) {} });
          splitInstances = [];
        }
      };
    }
  };
})();
