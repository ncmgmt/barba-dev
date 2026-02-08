# Codebase Concerns

**Analysis Date:** 2026-02-08

## Tech Debt

**Complex state management in core.js:**
- Issue: `WFApp` global object accumulates state across page navigations (readiness gates, freeze states, scroll locks, menu instances, loaded scripts). Multiple overlapping state tracking mechanisms.
- Files: `dist/core.js` (lines 64-74, 172-188, 217-235, 357-434, 893-920)
- Impact: Hard to debug state-related bugs, potential race conditions during rapid navigation, memory leaks if cleanup fails
- Fix approach: Consolidate state into a single managed object; add explicit lifecycle hooks for state reset; consider moving state management out of global object into a scoped closure pattern

**Tightly coupled page controllers:**
- Issue: Each page controller (Home, Portfolio, Contact, etc.) reimplements similar patterns (listener cleanup, ScrollTrigger management, GSAP context creation). No shared utility for common cleanup patterns.
- Files: `dist/pages/Home.js` (874-911), `dist/pages/Portfolio.js`, `dist/pages/Contact.js` (700+)
- Impact: Duplication of boilerplate, inconsistent cleanup logic across pages, harder to maintain
- Fix approach: Extract common page controller patterns (listener tracking, ScrollTrigger/GSAP cleanup) into shared helpers; create a base controller class or factory function

**Deeply nested animation timelines:**
- Issue: Home page has deeply nested GSAP timelines and MatchMedia conditions (Home.js lines 366-853, especially around feature section at 541-599 and portfolio section at 601-821)
- Files: `dist/pages/Home.js` (entire init function)
- Impact: Difficult to debug animation timing issues, hard to modify or refactor animations, performance risk with hundreds of ScrollTriggers
- Fix approach: Break animation setup into smaller, composable functions per section; consider lazy-loading animation setup only when sections are in viewport

**Inconsistent error handling:**
- Issue: Heavy use of try-catch with silent `catch (_) {}` blocks throughout (core.js, global.js, page controllers). No logging of errors that could indicate real problems.
- Files: `dist/core.js` (lines 137-144), `dist/global.js` (lines 457, 488-509, 544-575)
- Impact: Silent failures make debugging production issues impossible; real errors get masked
- Fix approach: Replace blanket try-catch with specific error types; log errors to console in development; create error reporting hook for production

## Known Bugs

**Barba double-initialization risk:**
- Symptoms: If core.js is accidentally loaded inside the Barba container, it runs twice, causing duplicate transitions and recursive hook execution
- Files: `dist/core.js` (lines 672-678)
- Trigger: Webflow markup structure where `<script src="core.js">` is nested inside `data-barba="container"`
- Workaround: Defensive check in place (line 674), but should fail loudly rather than silently
- Fix approach: Add warning when double-init is detected; provide clearer documentation on script placement requirements

**ScrollTrigger refresh timing issues:**
- Symptoms: ScrollTriggers sometimes evaluate with incorrect scroll position on page load, causing animations to miss their entry points
- Files: `dist/core.js` (line 755, 930-931), `dist/pages/Home.js` (line 852)
- Trigger: Race condition between IX2 initialization, DOM paint, and ScrollTrigger refresh calls
- Workaround: Multiple `waitForPaint()` calls and explicit `ScrollTrigger.refresh()` to force re-evaluation
- Fix approach: Standardize the paint-wait-refresh sequence; consider a single unified "DOM ready" signal before any animation setup

**Menu close not always idempotent:**
- Symptoms: Menu sometimes stays open during rapid navigation if the GSAP timeline ignores close requests (see global.js lines 744-747)
- Files: `dist/global.js` (lines 744-747, 858-887)
- Trigger: Fast clicks on menu toggle while GSAP timeline is active, then immediate Barba navigation
- Workaround: `closeMenu()` with fallback force-close and timeout (lines 868-887)
- Fix approach: Queue menu state changes instead of dropping them; use a state machine rather than relying on timeline.isActive()

**Gap issues during transitions (partially fixed):**
- Symptoms: Brief visual gaps appear during page transitions under certain conditions (footer nav jump, opacity flicker, layout reflow)
- Files: `dist/core.js` (entire file is heavily patched for this - see commit history)
- Trigger: Combination of Webflow layout, scroll unlock timing, overlay removal, and DisplayNone toggles
- Workaround: Complex sequence of `hideTransition()`, `waitForPaint()`, `freezeWrapperHeight()`, `unlockBody()` with carefully tuned delays (lines 895-938)
- Fix approach: The current approach works but is fragile. Consider a higher-level abstraction that coordinates all visual state changes in one place rather than scattered through hooks

## Security Considerations

**XSS risk in dynamic HTML generation:**
- Risk: Text decode effects and form tooltips use `.innerHTML` in some places (global.js line 79, Contact.js form generation). If user input reaches these, XSS is possible.
- Files: `dist/global.js` (lines 68-91), `dist/pages/Contact.js` (form field rendering)
- Current mitigation: Mostly uses `.textContent`, but `.innerHTML` for encoded content suggests future refactoring risk
- Recommendations: Audit all dynamic DOM creation; prefer `.textContent` over `.innerHTML` except for explicitly safe content; sanitize any user-facing strings before DOM insertion

**External CDN dependencies without integrity checks:**
- Risk: Page controllers load libraries from jsDelivr without SRI (Subresource Integrity) hashes. A compromised CDN or MITM attack could inject malicious code.
- Files: `dist/pages/Home.js` (lines 10-12), Portfolio.js, Contact.js (similar patterns)
- Current mitigation: None
- Recommendations: Add SRI hashes to all CDN links; consider vendoring critical libraries; implement Content Security Policy (CSP) headers

**Global object pollution:**
- Risk: Multiple scripts (core.js, global.js, page controllers) add functions to `window` object. Could conflict with other third-party scripts.
- Files: `dist/core.js` (lines 64, 97, 116), `dist/global.js` (lines 247-251, 626-627)
- Current mitigation: Checks for existing functions before overwriting
- Recommendations: Namespace all globals under a single root (already done for `WFApp`); document all window-level APIs; consider moving random character functions into WFApp namespace

**Missing authentication/authorization:**
- Risk: If form endpoints (Contact page) don't validate requests server-side, bot spam or unauthorized submissions are possible
- Files: `dist/pages/Contact.js` (form submission logic)
- Current mitigation: Client-side validation only (visible in code)
- Recommendations: Ensure all form submissions include CSRF tokens; validate all inputs server-side; rate-limit form endpoints; use honeypot fields

## Performance Bottlenecks

**Excessive DOM queries during animations:**
- Problem: Home page queries the same elements repeatedly within animation loops (Portfolio items, feature items, etc.)
- Files: `dist/pages/Home.js` (lines 386-394, 557-588, 719-791)
- Cause: MatchMedia context creates fresh closures on each media query change, re-querying DOM each time
- Improvement path: Cache element references once outside the MatchMedia loop; use data attributes instead of repeated querySelector calls

**ScrollTrigger creation overhead:**
- Problem: Home page creates 40+ ScrollTriggers (one per line, per item, per fade trigger). Home alone has ~50 triggers.
- Files: `dist/pages/Home.js` (lines 482-491, 510-518, 530-538, 579-587, 779-790, 831-849)
- Cause: Each ScrollTrigger is fully independent; no batching or delegation
- Improvement path: Group related triggers; use a single trigger with multiple onUpdate callbacks; lazy-create triggers only when sections enter viewport; profile to measure actual impact

**Repeated animation setup on every navigation:**
- Problem: Home page animations recreate GSAP timelines, ScrollTriggers, and SplitType instances every time the page loads
- Files: `dist/pages/Home.js` (lines 345-856)
- Cause: GSAP context is created fresh; no caching or memoization
- Improvement path: Cache SplitType instances (lines 362-364) after first load; memoize timeline setup; only recreate if DOM structure changes

**Menu blocks background generation delay:**
- Problem: Opening the menu triggers block creation via `bwCreateBlocksAll()` inside the timeline (global.js lines 726-730), which can block other animations
- Files: `dist/global.js` (lines 512-536, 726-730)
- Cause: ResizeObserver or polling loop waits for container size; happens synchronously during menu open animation
- Improvement path: Pre-generate blocks on page load; defer to next idle time; use requestIdleCallback if available

## Fragile Areas

**Barba transition hook coordination:**
- Files: `dist/core.js` (lines 715-945)
- Why fragile: Complex state machine with 5 hooks (once, leave, beforeEnter, enter, after) that must execute in strict order. Missing one paint or state update breaks the whole sequence. Recent commits show 20+ gap-fixing iterations.
- Safe modification: Never skip the double `waitForPaint()` calls (lines 753-757, 867, 910-911); always finalize in `after` hook, not earlier; test extensively with slow 3G network simulation
- Test coverage: Gaps likely because transitions are hard to test; visual inspection needed. No automated e2e tests visible.

**Menu state syncing across Barba navigation:**
- Files: `dist/global.js` (lines 628-888)
- Why fragile: Menu button state (class `nav-open`) must stay in sync with timeline and DOM visibility. Rapid clicks can desync them. The fallback force-close logic (lines 870-887) is a band-aid.
- Safe modification: Any change to menu open/close logic must account for: (1) timeline.isActive() can drop requests, (2) menuWrapEl.style.display must match timeline state, (3) Barba.beforeLeave must close before navigation starts
- Test coverage: Untested - try rapid menu clicks during page transitions to find desyncs

**Form validation in Contact page:**
- Files: `dist/pages/Contact.js` (700+ lines of form logic)
- Why fragile: Complex multi-step form with many validation rules, conditional field visibility, tooltip positioning. Hard to debug when fields don't validate correctly.
- Safe modification: Change validation logic carefully; test all field combinations; verify tooltip positioning on mobile viewports
- Test coverage: Gaps in edge cases (very long input, special characters, rapid focus changes)

**External library loading sequence:**
- Files: `dist/pages/Home.js` (lines 249-342), Portfolio.js, Contact.js
- Why fragile: Swipers, SplitType, gsap_menu.js are loaded asynchronously. If they load slowly or fail, page breaks silently.
- Safe modification: Add explicit checks for library existence before use; provide fallbacks; consider bundling critical libraries
- Test coverage: No error handling for failed CDN loads; code assumes libraries always load

**Decode animation text mutation:**
- Files: `dist/global.js` (lines 40-165), `dist/pages/Home.js` (lines 45-192), `dist/pages/Portfolio.js` (lines 21-84)
- Why fragile: Multiple independent implementations of decode effect with subtle differences. Text gets stored in `dataset.originalText`, but if elements are reused or cloned, this can break. Uses requestAnimationFrame loops that can stack if not careful.
- Safe modification: Ensure decode effect tokens/cancellation work (lines 61-62 in global.js); never run decode twice on same element; clear originalText on page transition
- Test coverage: Untested - try rapid clicking on decode-effect elements to find double-animation issues

## Scaling Limits

**Page load time with animation framework:**
- Current capacity: Home page loads 990 lines of code + dependencies (Swiper, SplitType, gsap). With network + parse time, ~2-3 seconds to interactive
- Limit: Adding more sections or animations will push load time past 4-5 seconds. Mobile users may see stale content during page transition.
- Scaling path: Code split page controllers; lazy-load non-critical libraries; compress assets; consider removing less-visible animations on mobile

**ScrollTrigger memory usage:**
- Current capacity: ~50 ScrollTriggers per Home page load. Each holds references to DOM elements and animation timelines.
- Limit: >100 ScrollTriggers per page can cause jank; cleanup must be perfect or memory leaks occur
- Scaling path: Consolidate triggers using event delegation; lazy-create triggers; profile memory before adding more; consider switching to Intersection Observer for simple scroll-based reveals

**Barba navigation timeout:**
- Current capacity: 7000ms timeout (core.js line 717). Most navigations complete in <1000ms.
- Limit: If a page controller's `init()` blocks for >7 seconds, or if a CDN load hangs, Barba times out and leaves page in broken state
- Scaling path: Implement graceful timeout handling; auto-retry failed asset loads; provide visual feedback during long transitions; consider lowering timeout to catch hangs earlier

## Dependencies at Risk

**Barba.js SPA framework:**
- Risk: Barba is a lightweight router (5KB) that may not receive updates if Webflow devs stop using it. No built-in error recovery for navigation failures.
- Impact: If Barba.js stops being maintained, fixing bugs becomes impossible; Webflow-specific workarounds may break in future versions
- Migration plan: Monitor Barba GitHub for activity; consider forking if needed; alternatively, replace with custom router using History API + fetch (complex, not recommended unless Barba truly dies)

**GSAP 3.x (animation engine):**
- Risk: Commercial license required for production use in many cases. Frequent major version updates can break code.
- Impact: License compliance issues; animation timing changes in GSAP updates could break transitions
- Migration plan: Review GSAP license terms; pin to known-good version; test thoroughly before updating; document animation patterns to ease replacement if needed

**External CDN (jsDelivr, CDN.js):**
- Risk: Dependency on third-party CDN availability. Slow/unavailable CDN breaks page load.
- Impact: Page controllers fail silently if libraries don't load; users see broken animations but not broken forms
- Migration plan: Add fallback error handling; vendor critical libraries; use service worker to cache assets; monitor CDN status

**SplitType.js (text animation):**
- Risk: Newer library (2021+), less proven than GSAP. API could change; development may stall.
- Impact: Text animations on Home/Portfolio break if SplitType updates incompatibly
- Migration plan: Lock version in CDN link; create wrapper function to abstract SplitType API; have alternative ready (e.g., custom CharCode splitting)

## Missing Critical Features

**No error logging or monitoring:**
- Problem: Silent try-catch blocks throughout code mean errors go unnoticed in production. No way to detect broken pages or failed transitions.
- Blocks: Cannot debug production issues; cannot monitor SPA health; cannot alert on broken navigations
- Recommendation: Implement error logging (Sentry, Rollbar, or simple fetch to backend); log failed asset loads; track page load metrics

**No loading state UI:**
- Problem: During slow CDN loads or network delays, users see no indication that a page is loading
- Blocks: Bad perceived performance; users may click again thinking the page froze
- Recommendation: Show a loading spinner or progress bar during asset load; provide feedback that transition is in progress

**No fallback for JavaScript disabled:**
- Problem: Entire site is SPA-based and requires JavaScript. No graceful fallback.
- Blocks: Accessibility issue; users with JS disabled cannot navigate
- Recommendation: Add `<noscript>` message; provide server-side redirect endpoints; consider hybrid approach with some pages working without JS

**No offline support:**
- Problem: If user loses internet mid-transition, page hangs with no recovery
- Blocks: Bad UX on flaky networks; no offline functionality
- Recommendation: Implement service worker for asset caching; handle offline state explicitly; queue form submissions

**No analytics integration:**
- Problem: Hard to tell which page sections users interact with or which animations they see
- Blocks: Cannot optimize based on user behavior; cannot measure animation engagement
- Recommendation: Add event tracking for page views, form submits, and animation triggers; send to analytics backend

## Test Coverage Gaps

**Transition edge cases untested:**
- What's not tested: Double-click navigation, rapid back-button mashing, navigation during active animation, very slow networks, missing container elements
- Files: `dist/core.js` (entire transition system)
- Risk: Silent failures or broken state during edge case navigations; users stuck on broken page
- Priority: High - transitions are the critical path

**Form validation untested:**
- What's not tested: Very long inputs, special characters, rapid field changes, validation on slow network, form resubmission
- Files: `dist/pages/Contact.js`
- Risk: Form appears valid but backend rejects submission; users confused
- Priority: High - form is money-generating feature (contact page)

**ScrollTrigger/GSAP animations untested:**
- What's not tested: Animations with scroll on mobile, animation performance under load, animation cleanup on page leave, memory leaks after multiple navigations
- Files: `dist/pages/Home.js`, `dist/global.js`
- Risk: Jank/lag on lower-end devices; memory leaks accumulate over session; animations break on second page load
- Priority: Medium - affects perceived performance

**Menu interaction untested:**
- What's not tested: Menu open/close during page transition, nested menus, menu on narrow viewports, menu keyboard interaction
- Files: `dist/global.js` (menu system)
- Risk: Menu desyncs from UI; keyboard navigation doesn't work; menu broken on some viewports
- Priority: Medium - navigation is important but not critical path

**External library failures untested:**
- What's not tested: CDN timeouts, library load failures, missing global dependencies (GSAP, ScrollTrigger not loaded)
- Files: All page controllers
- Risk: Page breaks silently with no indication of what failed
- Priority: Medium - impacts reliability

---

*Concerns audit: 2026-02-08*
