---
phase: 02-block-reveal
plan: 01
subsystem: ui
tags: [animation, barba, lifecycle, visual-effects, block-reveal]

# Dependency graph
requires:
  - phase: 01-nav-persistence
    provides: Barba leave hook cleanup pattern, scoped lifecycle management
provides:
  - BWBlockReveal utility with blockReveal(), coverAndReveal(), cleanupAll() functions
  - Grid overlay animation with cluster blink and staggered fade effects
  - Barba lifecycle integration preventing orphaned animations
  - window.BWBlockReveal and WFApp.global API exposure
affects: [03-team-block-reveal, any phase needing image reveal animations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CSS Grid-based overlay animation with pure CSS transitions
    - Timer registry pattern for cleanup (activeReveals array)
    - Barba leave hook cleanup for cancelling active animations
    - ES5-compatible IIFE module pattern

key-files:
  created: []
  modified:
    - dist/global.js
    - dist/core.js

key-decisions:
  - "Use CSS transitions instead of GSAP for cell fades to match bw24 fidelity"
  - "Track all setTimeout IDs in timers array for cleanup capability"
  - "Expose API on both window.BWBlockReveal (backward compat) and WFApp.global"
  - "Call cleanup in Barba leave hook (not beforeLeave) to consolidate with other cleanup"

patterns-established:
  - "Animation utilities must expose cleanup() methods and register in activeReveals array"
  - "Barba leave hook is canonical location for animation/effect cleanup"
  - "Pure CSS transitions preferred over GSAP for simple fade effects"

# Metrics
duration: ~35min (including human verification checkpoint)
completed: 2026-02-09
---

# Phase 2 Plan 1: BWBlockReveal Integration Summary

**Grid overlay animation utility with CSS Grid layout, cluster blink effects, and staggered fade-out ported from bw24, integrated into Barba lifecycle**

## Performance

- **Duration:** ~35 min (including human verification checkpoint)
- **Started:** 2026-02-09 (exact time not recorded)
- **Completed:** 2026-02-09T23:34:33Z
- **Tasks:** 3 (2 implementation + 1 human verification)
- **Files modified:** 2

## Accomplishments

- BWBlockReveal utility ported from bw24/bw-blockreveal.js as ES5-compatible IIFE module in global.js
- Grid overlay creates CSS Grid cells that blink in clusters during hold period, then fade in staggered/burst pattern
- Barba leave hook calls cleanupAll() to cancel active animations on navigation
- Home.js Swiper team section now shows block reveal animation on slide changes (previously calls silently failed)
- API exposed on window.BWBlockReveal and WFApp.global for developer and backward compatibility access

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement BWBlockReveal IIFE in global.js** - `ff20686` (feat)
2. **Task 2: Wire Barba beforeLeave cleanup in core.js** - `bb96edd` (feat)
3. **Task 3: Verify block reveal animation in browser** - Checkpoint approved by human

**Plan metadata:** (to be committed after SUMMARY.md creation)

## Files Created/Modified

- `dist/global.js` - Added BWBlockReveal IIFE module with blockReveal(), coverAndReveal(), cleanupAll(), cssVarToPx() functions. Exposed on WFApp.global and window.BWBlockReveal.
- `dist/core.js` - Added BWBlockReveal.cleanupAll() call in Barba leave hook to cancel active animations during navigation.

## Decisions Made

- **CSS transitions over GSAP:** Used pure CSS transitions for cell fades to match bw24 reference implementation exactly. Initial research suggested GSAP, but analysis of bw24 source showed CSS transitions were the original approach.
- **Timer registry pattern:** All setTimeout IDs tracked in timers array so cleanup() can clearTimeout on each one, preventing orphaned callbacks.
- **Dual API exposure:** Exposed on both window.BWBlockReveal (for Home.js backward compatibility) and WFApp.global (for developer API consistency).
- **Leave hook placement:** Added cleanup call to Barba leave hook (not beforeLeave) to consolidate with other cleanup logic like menu close and ScrollTrigger kill.

## Deviations from Plan

None - plan executed exactly as written. All implementation details matched the plan specification, including ES5 syntax requirements, CSS Grid layout, cluster blink effect, burst stagger pattern, and Barba lifecycle integration.

## Issues Encountered

None - implementation proceeded smoothly. Human verification checkpoint confirmed all 7 verification steps passed:

- Home page team Swiper block reveal works correctly
- window.BWBlockReveal returns object with expected methods
- WFApp.global.blockReveal returns function
- Navigation during animation works without console errors
- 10+ repeated navigations show no accumulation of orphaned elements

**User noted pre-existing issues unrelated to Block Reveal:**
- Flicker/jump on repeated page visits (pre-existing, not caused by this implementation)
- Mobile initial load issues (pre-existing, not caused by this implementation)
- Team page block reveal not yet implemented (expected - that's Phase 3)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BWBlockReveal foundation complete and verified
- Ready for Phase 2 Plan 2: Team page block reveal implementation
- API surface stable and tested (window.BWBlockReveal and WFApp.global.blockReveal)
- Cleanup pattern established and verified across 10+ navigations

---

## Self-Check

Verifying SUMMARY.md claims against actual state:

**Created files:**
- (None claimed)

**Modified files:**
- dist/global.js - FOUND
- dist/core.js - FOUND

**Commits:**
- ff20686 (Task 1) - FOUND
- bb96edd (Task 2) - FOUND

**Result:** PASSED - All claimed files and commits verified present.
