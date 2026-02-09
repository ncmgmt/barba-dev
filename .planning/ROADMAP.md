# Roadmap: barba-dev

## Overview

This milestone fixes three critical regressions and achieves feature parity with the pre-Barba (bw24) codebase. Phase 1 fixes the blocking nav persistence issue that breaks the SPA experience. Phase 2 ports the BWBlockReveal image animation library from bw24, providing the signature grid-overlay reveal effect. Phase 3 ensures Team page animations match bw24 behavior using Block Reveal animation for consistent UI/UX across the site. Phase 4 adds the theme toggle system. Phase 5 audits Home, Portfolio, Contact, and Insights controllers against their bw24 counterparts to verify complete parity.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Nav Persistence** - Fix nav/menu disappearing after internal Barba navigation
- [ ] **Phase 2: Block Reveal** - Port BWBlockReveal image animation library from bw24
- [ ] **Phase 3: Team Page Parity** - Ensure Team page animations match bw24 behavior using Block Reveal animation for consistent UI/UX
- [ ] **Phase 4: Theme System** - Add light/dark theme toggle with persistence
- [ ] **Phase 5: Parity Audit** - Verify Home/Portfolio/Contact/Insights controllers match bw24

## Phase Details

### Phase 1: Nav Persistence
**Goal**: Navigation, menu, footer, and transition overlay persist correctly across all Barba navigations without visual regression
**Depends on**: Nothing (first phase)
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05
**Success Criteria** (what must be TRUE):
  1. User sees nav bar on every page after navigating 10+ times in succession
  2. User can open menu, navigate to new page, and menu remains functional (toggle, Escape-key close work)
  3. User sees footer persist across transitions without flicker
  4. Initial hard page load shows no visual regression (nav/footer/overlay appear correctly)
  5. Transition overlay columns animate correctly during every navigation (leave and enter)
**Plans:** 2 plans

Plans:
- [ ] 01-01-PLAN.md — Fix DOM persistence of nav/footer/overlay (selectors, overlay placement, duplicate removal)
- [ ] 01-02-PLAN.md — Harden ScrollTrigger scoping, nav trigger lifecycle, and human verification

### Phase 2: Block Reveal
**Goal**: BWBlockReveal utility integrated into global.js, available for grid-based image reveals with staggered cell animations
**Depends on**: Phase 1 (stable navigation required for testing)
**Requirements**: BREV-01, BREV-02, BREV-03, BREV-04, BREV-05, BREV-06
**Success Criteria** (what must be TRUE):
  1. Developer can call WFApp.global.blockReveal() to create grid overlay that fades cells in randomized/staggered order
  2. Developer can call coverAndReveal() to hide image, run block reveal, then show image matching bw24 behavior
  3. Block reveal re-runs correctly after navigating to page, leaving, and returning (rebinds via Barba hooks)
  4. Navigating away during block reveal animation cancels cleanly with no orphaned DOM elements or timers
  5. Window.BWBlockReveal exists for backward compatibility with existing Home.js calls
**Plans**: TBD

Plans:
- [ ] (Plans will be added during planning phase)

### Phase 3: Team Page Parity
**Goal**: Team page card animations and click-to-expand panels match bw24 behavior using Block Reveal animation (BWBlockReveal.coverAndReveal) for image reveals to achieve consistent UI/UX across the site
**Depends on**: Phase 2 (uses BWBlockReveal.coverAndReveal API), Phase 1 (stable navigation)
**Requirements**: TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05
**Success Criteria** (what must be TRUE):
  1. User scrolls Team page and sees card image reveals using BWBlockReveal.coverAndReveal() API (same animation system from Phase 2) matching bw24 timing and visual consistency with other site pages
  2. User scrolls and sees clip-path reveals with timing and easing matching bw24
  3. User clicks card to expand info panel with clip-path animation matching bw24
  4. User navigates to Team page 10 times in succession and sees no ScrollTrigger errors or memory growth
  5. Inspecting DOM after 10 navigations shows text nodes (not orphaned SplitType span wrappers)
**Plans**: TBD

Plans:
- [ ] (Plans will be added during planning phase)

### Phase 4: Theme System
**Goal**: Users can toggle between light and dark themes with persistence across sessions and Barba navigations
**Depends on**: Phase 1 (nav toggle button needs to persist)
**Requirements**: THME-01, THME-02, THME-03, THME-04, THME-05, THME-06
**Success Criteria** (what must be TRUE):
  1. User clicks theme toggle button and page switches between light/dark with CSS transition
  2. User reloads page and selected theme persists (loaded from localStorage)
  3. New user with no saved theme sees theme matching their OS prefers-color-scheme setting
  4. Theme applies to page_wrap, footer, menu background, scrollbar, and nav SVG toggle icons
  5. Logo variant switches between is-v1 (first load) and is-v2 (subsequent) based on sessionStorage
  6. User navigates between pages and theme remains consistent (re-applies via Barba afterEnter hook)
**Plans**: TBD

Plans:
- [ ] (Plans will be added during planning phase)

### Phase 5: Parity Audit
**Goal**: Home, Portfolio, Contact, and Insights page controllers audited against bw24 originals to verify complete behavioral parity
**Depends on**: Phase 4 (all core systems stable)
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05
**Success Criteria** (what must be TRUE):
  1. Home.js controller matches bw24/home_v4.js behavior (Swiper carousels, SplitType animations, feature/portfolio sections work identically)
  2. Portfolio.js matches bw24 portfolio scripts (decode effects, filter menu, collection item animations work identically)
  3. Contact.js matches bw24 form scripts (multi-step form, validation, animations work identically)
  4. Insights.js matches bw24 blog scripts (Finsweet CMS load hooks, pagination visibility, rebind behavior work identically)
  5. Each audited controller verified to work after 10+ repeated navigations with no leaks or duplicate listeners (tested via DevTools Memory Profiler)
**Plans**: TBD

Plans:
- [ ] (Plans will be added during planning phase)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Nav Persistence | 0/2 | Planned | - |
| 2. Block Reveal | 0/TBD | Not started | - |
| 3. Team Page Parity | 0/TBD | Not started | - |
| 4. Theme System | 0/TBD | Not started | - |
| 5. Parity Audit | 0/TBD | Not started | - |
