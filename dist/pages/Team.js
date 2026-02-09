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

              // Transparent bg — solid block-reveal cells behind the info panel
              // ARE the visual background when the card is open.
              teamCardInfos.forEach(function (info) {
                gsap.set(info, {
                  backgroundImage: 'none',
                  backgroundColor: 'transparent'
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

              // Cells stagger in (coverMs), blink, then stay solid (coverOnly).
              // Caller triggers handle.dissolve() on close to fade cells out.
              var blockRevealOpts = {
                coverMs: 70, holdMs: 200, baseStagger: 3, fadeMs: 90,
                burstEvery: 14, burstDelay: 10, clusterCount: 6,
                clusterRadius: 1, blinkMs: 50, coverOnly: true
              };

              function fireBlockReveal(el, opts) {
                if (!window.BWBlockReveal || typeof window.BWBlockReveal.blockReveal !== 'function') return null;
                if (getComputedStyle(el).position === 'static') {
                  el.style.position = 'relative';
                }
                var handle = window.BWBlockReveal.blockReveal(el, opts || blockRevealOpts);
                if (handle) blockRevealHandles.push(handle);
                return handle;
              }

              function getListItem(el) {
                try { return el.closest('.team_list_item'); } catch (_) { return null; }
              }

              // FLIP-based shuffle→sort: words render in random order then
              // smoothly glide into their correct positions.
              function shuffleReveal(el) {
                var text = el.textContent;
                if (!text || !text.trim()) return;
                el.dataset.originalText = text;

                var words = text.trim().split(/\s+/);
                if (words.length < 2) {
                  // Single word — simple fade
                  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
                  return;
                }

                // Build word spans (correct order)
                var spans = [];
                for (var i = 0; i < words.length; i++) {
                  var span = document.createElement('span');
                  span.style.display = 'inline-block';
                  span.textContent = words[i];
                  spans.push(span);
                }

                // Fisher-Yates shuffle (copy)
                var shuffled = spans.slice();
                for (var k = shuffled.length - 1; k > 0; k--) {
                  var j = Math.floor(Math.random() * (k + 1));
                  var tmp = shuffled[k];
                  shuffled[k] = shuffled[j];
                  shuffled[j] = tmp;
                }

                // Render shuffled order → measure FIRST positions
                el.innerHTML = '';
                for (var i = 0; i < shuffled.length; i++) {
                  if (i > 0) el.appendChild(document.createTextNode(' '));
                  el.appendChild(shuffled[i]);
                }
                var first = spans.map(function (s) {
                  var r = s.getBoundingClientRect();
                  return { x: r.left, y: r.top };
                });

                // Reorder to correct order → measure LAST positions
                el.innerHTML = '';
                for (var i = 0; i < spans.length; i++) {
                  if (i > 0) el.appendChild(document.createTextNode(' '));
                  el.appendChild(spans[i]);
                }
                var last = spans.map(function (s) {
                  var r = s.getBoundingClientRect();
                  return { x: r.left, y: r.top };
                });

                // INVERT: offset each word so it visually sits at its shuffled position
                for (var i = 0; i < spans.length; i++) {
                  gsap.set(spans[i], {
                    x: first[i].x - last[i].x,
                    y: first[i].y - last[i].y,
                    opacity: 0.35
                  });
                }

                // PLAY: animate to correct positions
                gsap.to(spans, {
                  x: 0,
                  y: 0,
                  opacity: 1,
                  duration: 0.6,
                  stagger: 0.025,
                  ease: 'power3.out'
                });
              }

              function getLeafTextEls(root) {
                var all = Array.prototype.slice.call(root.querySelectorAll('*'));
                return all.filter(function (el) {
                  var tag = el.tagName;
                  if (tag === 'STYLE' || tag === 'SCRIPT' || tag === 'SVG' || tag === 'IMG') return false;
                  return el.children.length === 0 && el.textContent && el.textContent.trim();
                });
              }

              function openCardInfo(imgEl, infoEl, card) {
                var listItem = getListItem(card);
                if (listItem) listItem.classList.add('active');

                // Cells stagger in over image and stay solid (coverOnly).
                // Once covered, panel slides up and words fade in staggered.
                var imgHandle = fireBlockReveal(imgEl);
                var coverDone = (imgHandle && imgHandle.coverPhaseDuration) || 0;

                setTimeout(function () {
                  gsap.fromTo(infoEl,
                    { opacity: 0, clipPath: 'inset(100% 0% 0% 0%)' },
                    {
                      opacity: 1,
                      clipPath: 'inset(0% 0% 0% 0%)',
                      duration: 0.45,
                      ease: 'power2.out'
                    }
                  );

                  getLeafTextEls(infoEl).forEach(function (el) {
                    shuffleReveal(el);
                  });
                }, coverDone);

                return imgHandle;
              }

              function closeCardInfo(imgEl, infoEl, card, handle) {
                var listItem = getListItem(card);
                if (listItem) listItem.classList.remove('active');

                // Text out, then dissolve the solid cells to uncover grayscale image.
                gsap.to(infoEl, {
                  opacity: 0,
                  duration: 0.2,
                  ease: 'power2.in',
                  onComplete: function () {
                    gsap.set(infoEl, { clipPath: 'inset(100% 0 0 0)' });
                    // Restore original text for next open
                    getLeafTextEls(infoEl).forEach(function (el) {
                      if (el.dataset.originalText !== undefined) {
                        el.textContent = el.dataset.originalText;
                      }
                    });
                  }
                });

                if (handle && handle.dissolve) handle.dissolve();
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
                      closeCardInfo(activeCard.img, activeCard.info, activeCard.card, activeCard.handle);
                    }

                    var op = gsap.getProperty(info, 'opacity');
                    if (Number(op) === 0) {
                      var handle = openCardInfo(img, info, card);
                      activeCard = { img: img, info: info, card: card, handle: handle };
                    } else {
                      closeCardInfo(img, info, card, activeCard ? activeCard.handle : null);
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
                        closeCardInfo(activeCard.img, activeCard.info, activeCard.card, activeCard.handle);
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
