# Architecture

**Analysis Date:** 2026-02-08

## Pattern Overview

**Overall:** Webflow-integrated page transition router with namespace-based per-page controller mounting/unmounting.

**Key Characteristics:**
- Barba.js core for page transitions without requiring a bundler
- Global registry (`window.WFApp`) for controller registration and lifecycle management
- Per-namespace lazy-loaded controller scripts via CDN
- Readiness gate system to synchronize controller initialization with overlay animations
- GSAP-based column transition animations with optional ScrollTrigger cleanup
- Persistent layout elements (nav, footer, overlay) outside Barba's swappable container

## Layers

**Global Core (`dist/core.js`):**
- Purpose: Bootstrap Barba transitions, manage controller lifecycle, handle page readiness signaling
- Location: `dist/core.js` (956 lines)
- Contains: Configuration constants, transition helpers, controller mounting/unmounting logic, Barba hook definitions
- Depends on: `window.barba` (UMD), `window.gsap` (optional), `window.ScrollTrigger` (optional)
- Used by: All page controllers via `window.WFApp` global registry

**Page Controllers (`dist/pages/<Namespace>.js`):**
- Purpose: Register per-page initialization logic that runs under the transition overlay
- Location: `dist/pages/` directory with files named `[Namespace].js` (e.g., `Home.js`, `Portfolio.js`)
- Contains: GSAP animations, event listeners, DOM queries scoped to `container` parameter
- Depends on: External libraries loaded via `WFApp.loadScriptOnce()` (Swiper, SplitType, etc.)
- Used by: Barba's `enter`/`once` hooks after controller.init() is called
- Key contracts: Must export `window.WFApp.pages[Namespace] = { init({ container, namespace, data }) {} }`

**Global Persistent Handler (`dist/global.js`):**
- Purpose: Manage truly global behaviors (menu close, decode effects, hover handlers) that persist across page transitions
- Location: `dist/global.js`
- Contains: Helper functions (decodeEffect, randomCharacter variants), hover/click event binding, menu control
- Depends on: `window.GSAP` (optional), `window.WFApp.global`
- Used by: Called via hooks from core (`initOnce()`, `afterEnter()`, `closeMenu()`)

**Default Fallback (`dist/pages/default.js`):**
- Purpose: Safe no-op controller for unknown namespaces
- Location: `dist/pages/default.js`
- Contains: Empty init() that returns destroy stub
- Used by: Core when namespace controller not found

## Data Flow

**Initial Page Load (once hook):**

1. Barba fires `once(data)` hook
2. Core creates readiness gate (`WFApp.ready.signal(token)`)
3. Core ensures transition overlay is visible, locks scroll
4. Logo animation plays once (via `sessionStorage.logoAnimated`)
5. Core triggers `mountNamespace(ns, container)` which:
   - Loads controller script via `WFApp.loadScriptOnce()` from CDN
   - Calls `controller.init({ container, namespace, data })`
   - Stores instance in `WFApp._instances[ns]`
6. Core waits for `WFApp.ready.signal()` call (timeout: 4000ms) to proceed
7. Once ready, fires `pageTransitionBeforeReveal` event
8. Animates overlay columns down (`animateEnter()`) over 1.25s
9. Fires `pageTransitionCompleted` mid-enter (at 0.5s), fires `pageTransitionAfterReveal` post-reveal
10. Hides overlay and unlocks scroll in `after` hook

**Internal Navigation (leave + beforeEnter + enter + after hooks):**

1. User clicks link → Barba detects valid navigation
2. `leave(data)` hook:
   - Closes menu overlays
   - Ensures overlay visible
   - Freezes wrapper height
   - Kills ScrollTriggers in outgoing container only
   - Unmounts previous namespace controller (calls `destroy()`)
   - Animates columns up to cover viewport (0.8s)
   - Scrolls to top (inside covered columns)
   - Hides outgoing container
3. Barba swaps DOM (under hidden columns)
4. `beforeEnter(data)`:
   - Creates fresh readiness gate
   - Re-initializes Webflow IX2 interactions
5. `enter(data)`:
   - Mounts new namespace controller (early, under overlay)
   - Waits for controller to signal readiness
   - Does NOT animate reveal (deferred to `after`)
   - Sets `WFApp._pendingInternalReveal = true`
6. `after(data)`:
   - Animates reveal (columns down, fade in)
   - Hides overlay
   - Unlocks scroll
   - Calls global `afterEnter(data)` hook

**State Management:**

- **Controller Instances:** `WFApp._instances[namespace]` → stores returned instance with optional `destroy()` method
- **Loaded Scripts:** `WFApp._loadedScripts` (Set) → prevents duplicate CDN loads
- **Readiness Gate:** `WFApp.ready._state` → tokens ensure stale navigation don't resolve new gate
- **Scroll Lock:** `WFApp._scrollLocked` flag with event listener references for cleanup
- **Height Freeze:** `WFApp._freezeState` stores original `minHeight` during transitions
- **Session State:** `sessionStorage.logoAnimated` → prevents logo animation on every navigation

## Key Abstractions

**WFApp Global Registry:**
- Purpose: Central object for page controllers, instances, and lifecycle helpers
- Examples: `window.WFApp.pages`, `window.WFApp._instances`, `window.WFApp.ready`
- Pattern: Lazy initialization pattern with defensive null-coalescing throughout

**Readiness Gate (Semaphore):**
- Purpose: Synchronize controller initialization with overlay reveal timing
- Implementation: Token-based promise system in `WFApp.ready._state`
- Key methods: `WFApp.ready.signal(token)` to resolve gate when content is ready
- Safety: Tokens prevent stale navigations from resolving the wrong gate

**Controller Contract:**
- Purpose: Standardize how page-specific code integrates with core
- Interface: `{ init({ container, namespace, data }) { return { destroy() {} } } }`
- GSAP pattern: Wrap all animations in `gsap.context(callback, container)` so `ctx.revert()` kills ScrollTriggers too
- Scoping: All DOM queries must use `container` as root (not document)

**Overlay Persistence:**
- Purpose: Keep transition elements outside Barba's swappable container
- Implementation: `persistTransitionOverlay()` moves overlay to document.body if found inside container
- Related selectors: nav, footer, .w-nav, .navbar
- Key insight: Barba would otherwise swap/remove these persistent elements

**ScrollTrigger Scoping:**
- Purpose: Kill only animations tied to outgoing page content
- Implementation: Check if trigger element is in outgoing container AND animation targets are in outgoing container
- Safeguard: Global nav/menu ScrollTriggers are preserved (targets may live outside container)

## Entry Points

**Core Bootstrap (`dist/core.js`):**
- Location: `dist/core.js`
- Triggers: Included globally in Webflow via script tag (before page controllers)
- Responsibilities: Initialize Barba, register hooks, setup WFApp registry, manage transition overlays

**Page Controller Registration (`dist/pages/<Namespace>.js`):**
- Location: Lazily loaded from CDN when namespace mounts
- Triggers: `mountNamespace()` after leave phase, once DOM is swapped
- Responsibilities: Initialize page-specific animations, event listeners, set readiness signal when content is stable

**Global Handler (`dist/global.js`):**
- Location: Conditionally loaded (optional, via `window.WFApp.global`)
- Triggers: `initOnce()` on first load, `afterEnter()` after every navigation, `closeMenu()` on beforeLeave/beforeEnter
- Responsibilities: Persistent behaviors that outlive page transitions

## Error Handling

**Strategy:** Defensive error catching throughout; no hard failures to prevent broken transitions.

**Patterns:**
- Try-catch blocks wrap all DOM manipulation, animation setup, and third-party API calls
- Failed operations are logged (if debug enabled) but don't break the transition flow
- Barba timeout (7000ms) catches hung transitions
- Readiness gate timeout (4000ms) prevents indefinite waits for controller signals
- Missing controller falls back to `WFApp.pages.default` (no-op)

## Cross-Cutting Concerns

**Logging:** `CONFIG.debug` flag (true by default) controls `log()` and `warn()` output to console. Production can override via `window.WFAPP_DEBUG = false`.

**Validation:**
- Namespace checked against whitelist: `['Home', 'Portfolio', 'Team', 'Insights', 'Contact', 'Imprint', 'Legal', 'PrivacyPolicy', 'Summit']`
- DOM readiness checked via `waitForPaint()` (double rAF) to ensure Webflow IX2 has applied initial states
- Transition overlay visibility verified before hiding (prevents premature reveal)

**Authentication:** Not applicable; this is a frontend-only transition layer.

---

*Architecture analysis: 2026-02-08*
