---
phase: 01-nav-persistence
plan: 02
subsystem: ui
tags: [barba.js, scrolltrigger, gsap, menu, navigation, webflow]

# Dependency graph
requires:
  - phase: 01-nav-persistence plan 01
    provides: DOM persistence of nav/footer/overlay outside Barba container
provides:
  - Nav ScrollTriggers tagged with IDs for precise cleanup across navigations
  - Nav position reset on page transition to prevent stuck hidden state
  - Menu overlay gradient background fix (background shorthand vs background-color)
  - data-theme attribute set on .page_wrap for Webflow CSS selectors
  - Home.js safeKillST removed to prevent global ScrollTrigger destruction
affects: [02-block-reveal, 04-theme-system, navigation, transitions]

# Tech tracking
tech-stack:
  added: []
  patterns: [id-tagged-scrolltriggers, nav-reset-on-transition, theme-attribute-propagation]

key-files:
  created: []
  modified: [dist/core.js, dist/global.js, dist/pages/Home.js]

key-decisions:
  - "Tag nav ScrollTriggers with IDs (nav-hide-on-footer, nav-backdrop-blur) for precise cleanup"
  - "Kill nav triggers in leave hook (not afterEnter) to prevent false triggering during DOM swap"
  - "Reset nav to y:0%/opacity:1 before re-creating triggers after navigation"
  - "Set data-theme on .page_wrap (not just html) because Webflow CSS uses .page_wrap[data-theme] selectors"
  - "Use background shorthand (not background-color) for menu overlay because --theme--gradient resolves to linear-gradient()"
  - "Remove safeKillST() from Home.js destroy — it killed all global ScrollTriggers including nav"

patterns-established:
  - "Pattern 1: Nav ScrollTriggers use id fields for selective kill/re-create across navigations"
  - "Pattern 2: Nav position explicitly reset before trigger re-init (kill() does not revert animated state)"
  - "Pattern 3: data-theme must be on .page_wrap for Webflow component selectors"
  - "Pattern 4: Page controllers must NOT use safeKillST() — use scoped cleanup (ctx.revert, mm.kill, st.forEach)"

# Metrics
duration: ~30 min
completed: 2026-02-09
---

# Phase 01 Plan 02: ScrollTrigger Scoping & Human Verification Summary

**Nav ScrollTriggers tagged with IDs for precise lifecycle, menu overlay gradient fixed, data-theme propagated to .page_wrap, and nav flicker during transitions eliminated**

## Performance

- **Duration:** ~30 min (including human verification cycle)
- **Started:** 2026-02-09
- **Completed:** 2026-02-09
- **Tasks:** 2 (1 auto + 1 human verification checkpoint)
- **Files modified:** 3

## Accomplishments
- Nav ScrollTriggers tagged with IDs for precise kill/re-create without collateral damage
- Nav flicker during page transitions eliminated by killing triggers in leave hook
- Menu overlay background fixed (linear-gradient via background shorthand)
- data-theme attribute propagated to .page_wrap for Webflow CSS selectors
- Home.js global ScrollTrigger kill removed to prevent nav trigger destruction
- Human verification confirmed all 5 NAV requirements pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden ScrollTrigger scoping and nav trigger lifecycle** - `0615879` (feat)
2. **Bugfix: data-theme on .page_wrap + Home.js safeKillST removal + nav reset** - `83f7f1b` (fix)
3. **Bugfix: Menu overlay background + nav flicker during transition** - `d157ca7` (fix)

## Files Created/Modified
- `dist/core.js` - Nav trigger kill in leave hook, data-theme on .page_wrap, ScrollTrigger scoping comments
- `dist/global.js` - Nav trigger ID tags, nav reset before re-init, menu overlay background fix
- `dist/pages/Home.js` - Removed safeKillST() from destroy

## Decisions Made

1. **Kill nav triggers in leave (not afterEnter)** — During DOM swap, content_wrap temporarily collapses, causing the nav-hide-on-footer trigger to fire and flash-hide the nav. Killing in leave prevents this.

2. **Set data-theme on .page_wrap** — Webflow CSS uses `.page_wrap[data-theme='dark'] .layout_column_el` selectors, not `[data-theme] .layout_column_el`. Setting on `<html>` alone was insufficient.

3. **Use background shorthand for menu overlay** — `--theme--gradient` resolves to `linear-gradient()`. `background-color` rejects gradients; only `background` (shorthand) accepts them.

4. **Remove safeKillST() from Home.js** — This function killed ALL ScrollTriggers globally, including nav triggers. When nav was in hidden state (y:-100%), killing the trigger left it stuck. Home's own triggers are already cleaned by ctx.revert/mm.kill/st.forEach.

## Deviations from Plan

### Auto-fixed Issues

**1. data-theme attribute on wrong element**
- **Found during:** Human verification (Task 2)
- **Issue:** Transition columns had no background; Webflow CSS uses .page_wrap[data-theme] not [data-theme] on html
- **Fix:** core.js init() sets data-theme on .page_wrap from localStorage/default
- **Committed in:** 83f7f1b

**2. Home.js safeKillST destroys nav triggers**
- **Found during:** Human verification (Task 2)
- **Issue:** Nav disappeared permanently when navigating away from Home
- **Fix:** Removed safeKillST() from Home.js destroy; Home's triggers already cleaned by scoped methods
- **Committed in:** 83f7f1b

**3. Menu overlay invisible (gradient in background-color)**
- **Found during:** Human verification (Task 2)
- **Issue:** nav_menu_base background-color: var(--theme--gradient) invalid because value is linear-gradient()
- **Fix:** Set background (shorthand) via JS in menu init
- **Committed in:** d157ca7

**4. Nav flickers during page transition**
- **Found during:** Human verification (Task 2)
- **Issue:** content_wrap collapses during DOM swap, footer trigger fires, nav hides then shows
- **Fix:** Kill nav triggers + reset nav visible in leave hook before DOM swap
- **Committed in:** d157ca7

---

**Total deviations:** 4 auto-fixed during human verification
**Impact on plan:** All fixes necessary for visual correctness. Required understanding actual Webflow DOM structure (fetched from live site). No scope creep.

## Issues Encountered

- Webflow DOM structure investigation required (curl + HTML parsing) to identify that data-theme is on .page_wrap article, not html
- CSS variable chain analysis needed to discover --theme--gradient resolves to linear-gradient() (incompatible with background-color)

## User Setup Required

None - fixes are in the JS files served via jsDelivr CDN.

## Next Phase Readiness

Phase 1 complete. Nav persistence verified across 10+ navigations. Ready for Phase 2 (Block Reveal).

**Key context for future phases:**
- data-theme must always be on .page_wrap (Phase 4 theme system must maintain this)
- Nav ScrollTriggers use IDs — any new nav triggers should follow this pattern
- Page controllers must use scoped cleanup, never safeKillST()

## Self-Check: PASSED

**Files verified:**
- ✓ dist/core.js exists and contains nav trigger kill in leave
- ✓ dist/global.js exists and contains nav trigger IDs and reset
- ✓ dist/pages/Home.js exists without safeKillST

**Commits verified:**
- ✓ 0615879 (Task 1: ScrollTrigger scoping)
- ✓ 83f7f1b (Fix: data-theme, Home.js, nav reset)
- ✓ d157ca7 (Fix: menu overlay, nav flicker)

**Human verification:**
- ✓ Transition columns have background
- ✓ Menu overlay visible
- ✓ Nav stable after 10+ navigations
- ✓ No nav flicker during transitions

---
*Phase: 01-nav-persistence*
*Completed: 2026-02-09*
