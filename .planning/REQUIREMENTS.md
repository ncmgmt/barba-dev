# Requirements: barba-dev

**Defined:** 2026-02-08
**Core Value:** Page transitions must be seamless and never break navigation or layout

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Navigation

- [ ] **NAV-01**: Nav/menu remains visible and functional after every internal Barba navigation (no disappearing)
- [ ] **NAV-02**: Menu toggle, open/close, and Escape-key close work correctly after any number of navigations
- [ ] **NAV-03**: Footer persists across all transitions without flicker
- [ ] **NAV-04**: No flicker or visual regression on initial hard load
- [ ] **NAV-05**: Transition overlay (.layout_transition_wrap) persists correctly outside Barba container

### Block Reveal

- [ ] **BREV-01**: BWBlockReveal utility integrated into global.js, available via WFApp.global.blockReveal()
- [ ] **BREV-02**: blockReveal() creates grid overlay and fades cells out in randomized/staggered order matching bw24 behavior
- [ ] **BREV-03**: coverAndReveal() hides image, runs blockReveal overlay, then shows image
- [ ] **BREV-04**: Block reveal re-runs/rebinds after Barba container swaps (via afterEnter / pageTransitionAfterReveal hooks)
- [ ] **BREV-05**: Block reveal cancels cleanly if navigation occurs mid-animation (no orphaned DOM or timers)
- [ ] **BREV-06**: BWBlockReveal also exposed on window.BWBlockReveal for backward compatibility with Home.js calls

### Team Page

- [ ] **TEAM-01**: Team card image reveal uses blockReveal for consistent UX matching bw24 behavior
- [ ] **TEAM-02**: Card scroll-triggered clip-path reveals match bw24 timing and easing
- [ ] **TEAM-03**: Click-to-expand info panel with clip-path animation matches bw24 behavior
- [ ] **TEAM-04**: Proper cleanup on destroy -- no ScrollTrigger leaks after 10+ navigations
- [ ] **TEAM-05**: SplitType instances reverted in destroy (no orphaned span wrappers in DOM)

### Theme System

- [ ] **THME-01**: Theme toggle button switches between light/dark themes with CSS transition
- [ ] **THME-02**: Theme persists in localStorage across page loads and navigations
- [ ] **THME-03**: Theme loads from localStorage on initial load, falls back to OS prefers-color-scheme
- [ ] **THME-04**: Theme applies to page_wrap, footer, menu background, scrollbar, and nav SVG toggle icons
- [ ] **THME-05**: Logo variant switches between is-v1 (first load) and is-v2 (subsequent) based on sessionStorage
- [ ] **THME-06**: Theme system re-applies correctly after Barba container swap (afterEnter hook)

### Parity Audit

- [ ] **AUDIT-01**: Home.js controller behavior audited against bw24/home_v4.js -- all animations, carousels, and interactions match
- [ ] **AUDIT-02**: Portfolio.js audited against bw24/portfolio-decode.js, portfolio-interaction_gsap.js, portfolio-filter_gsap.js -- decode effects, filter menu, collection item animations match
- [ ] **AUDIT-03**: Contact.js audited against bw24/form_contact.js + form_contact_functions.js + form_contact_gsap.js -- multi-step form, validation, animations match
- [ ] **AUDIT-04**: Insights.js audited against bw24/blog.js + blog-fsload.js -- Finsweet CMS load hooks, pagination visibility, rebind behavior match
- [ ] **AUDIT-05**: All audited controllers verified to work correctly after repeated Barba navigations (no leaks, no duplicate listeners)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Smooth Scroll

- **SMTH-01**: Lenis smooth scroll integration (bw24/lenisInstance.js parity)
- **SMTH-02**: Lenis pause/resume around Barba transitions

### Performance

- **PERF-01**: Preload/prefetch next-page assets during idle time
- **PERF-02**: Pin to git tags instead of @main for cache-safe CDN delivery

### Architecture

- **ARCH-01**: Extract shared controller boilerplate into base factory function
- **ARCH-02**: Consolidate WFApp state into single managed object

## Out of Scope

| Feature | Reason |
|---------|--------|
| New pages or page namespaces | This milestone is fixes and parity ports only |
| Build system / bundler | Current no-build CDN model is intentional |
| Server-side rendering | Frontend-only system |
| View Transitions API | Experimental, limited browser support |
| Lenis smooth scroll | Deferred to v2 per user constraint |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 1 | Pending |
| NAV-02 | Phase 1 | Pending |
| NAV-03 | Phase 1 | Pending |
| NAV-04 | Phase 1 | Pending |
| NAV-05 | Phase 1 | Pending |
| BREV-01 | Phase 2 | Pending |
| BREV-02 | Phase 2 | Pending |
| BREV-03 | Phase 2 | Pending |
| BREV-04 | Phase 2 | Pending |
| BREV-05 | Phase 2 | Pending |
| BREV-06 | Phase 2 | Pending |
| TEAM-01 | Phase 3 | Pending |
| TEAM-02 | Phase 3 | Pending |
| TEAM-03 | Phase 3 | Pending |
| TEAM-04 | Phase 3 | Pending |
| TEAM-05 | Phase 3 | Pending |
| THME-01 | Phase 4 | Pending |
| THME-02 | Phase 4 | Pending |
| THME-03 | Phase 4 | Pending |
| THME-04 | Phase 4 | Pending |
| THME-05 | Phase 4 | Pending |
| THME-06 | Phase 4 | Pending |
| AUDIT-01 | Phase 5 | Pending |
| AUDIT-02 | Phase 5 | Pending |
| AUDIT-03 | Phase 5 | Pending |
| AUDIT-04 | Phase 5 | Pending |
| AUDIT-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after roadmap creation*
