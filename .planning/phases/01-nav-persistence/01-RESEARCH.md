# Phase 01: Nav Persistence - Research

**Researched:** 2026-02-08
**Domain:** Barba.js v2 + Webflow navigation persistence
**Confidence:** HIGH

## Summary

Phase 1 addresses a critical architectural issue where navigation, footer, and transition overlay elements disappear after Barba.js page transitions. The root cause is straightforward: **Webflow places these elements inside the Barba container** (`data-barba="container"`), which Barba swaps out during navigation. The existing codebase already attempts to fix this via DOM relocation in `persistOutsideContainer()` and `persistTransitionOverlay()` (lines 623-651 of core.js), but the nav still disappears.

The issue requires investigation into **why the existing persistence code fails**, likely due to:
1. **Timing**: DOM relocation happens too late (after Barba has already initialized and cached the initial DOM structure)
2. **Incomplete relocation**: Not all persistent elements are being moved (nav wrappers, menu state, or event handlers)
3. **Re-insertion on swap**: Barba's DOM swap may be re-inserting nav from the fetched HTML

**Primary recommendation:** Verify DOM relocation timing, ensure all nav/footer/overlay elements are moved BEFORE Barba.init(), add defensive re-persistence in Barba hooks, and prevent global ScrollTriggers from being killed during container cleanup.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @barba/core | v2.x (UMD) | SPA-like page transitions | Industry standard for smooth page transitions without full reload |
| gsap | Latest (UMD) | Animation engine + ScrollTrigger | Powers transition animations and scroll-based interactions |
| Webflow | Hosted platform | Design system + IX2 interactions | Client's design platform; IX2 must be reinitialized after transitions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @barba/css | Optional | CSS-based transitions | If GSAP is unavailable; NOT used in this codebase |
| @barba/prefetch | Optional | Preload pages on hover | Performance optimization; not critical for persistence |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Barba.js | HTMX + View Transitions API | Modern approach, but requires rewrite + no IE11 support |
| DOM relocation | Duplicate nav in wrapper + container | Simpler but causes state desync (menu open/close) |
| Manual persistence | Barba's `prevent` attribute | Doesn't solve the problem; prevents transitions entirely |

**Installation:**
Already installed via CDN (jsDelivr). No npm install needed for Webflow projects.

## Architecture Patterns

### Recommended DOM Structure (Barba.js v2)
```html
<body>
  <div data-barba="wrapper">
    <!-- PERSISTENT: These stay across navigations -->
    <nav class="layout_nav_wrap">...</nav>
    <div class="layout_transition_wrap">...</div>

    <!-- SWAPPED: This gets replaced -->
    <main data-barba="container" data-barba-namespace="Home">
      <div class="content_wrap">...</div>
    </main>

    <!-- PERSISTENT: These stay across navigations -->
    <footer class="footer">...</footer>
  </div>
</body>
```

**Critical principle:** Everything inside `wrapper` but outside `container` persists. Everything inside `container` gets swapped.

### Pattern 1: Early DOM Relocation (Before Barba.init)
**What:** Move persistent elements outside the container BEFORE Barba initializes
**When to use:** When Webflow's exported structure places nav/footer inside the container
**Example:**
```javascript
// Source: Verified pattern from codebase (core.js lines 623-651)
function persistOutsideContainer(selectors) {
  var container = document.querySelector('[data-barba="container"]');
  var wrapper = document.querySelector('[data-barba="wrapper"]');
  if (!container || !wrapper) return;

  (selectors || []).forEach(function (sel) {
    var el = document.querySelector(sel);
    if (!el) return;
    if (container.contains(el)) {
      // insertBefore moves the node (no cloning needed)
      wrapper.insertBefore(el, container);
    }
  });
}

// CRITICAL: Must run BEFORE barba.init()
persistOutsideContainer(['nav', '.layout_nav_wrap', 'footer', '.layout_transition_wrap']);
barba.init({ /* ... */ });
```

### Pattern 2: Selective ScrollTrigger Cleanup
**What:** Kill only ScrollTriggers that belong to the outgoing container, preserve global ones
**When to use:** In `beforeLeave` hook to prevent nav/footer ScrollTriggers from being killed
**Example:**
```javascript
// Source: Adapted from core.js lines 537-574 + GSAP community patterns
function killScrollTriggersIn(containerEl) {
  if (!containerEl || !window.ScrollTrigger) return;

  ScrollTrigger.getAll().forEach(function (trigger) {
    var triggerEl = trigger.vars.trigger;
    if (typeof triggerEl === 'string') {
      triggerEl = containerEl.querySelector(triggerEl);
    }

    // Skip if trigger element is not in outgoing container
    if (!triggerEl || !containerEl.contains(triggerEl)) return;

    // CRITICAL: Don't kill if animation targets persistent elements
    var anim = trigger.animation;
    if (anim && anim.targets) {
      var targets = anim.targets();
      for (var i = 0; i < targets.length; i++) {
        if (!containerEl.contains(targets[i])) {
          return; // Keep this trigger
        }
      }
    }

    trigger.kill();
  });
}
```

### Pattern 3: Defensive Re-Persistence in Hooks
**What:** Re-check and move persistent elements after each navigation
**When to use:** As a safety net in `after` hook to catch elements re-inserted by Barba
**Example:**
```javascript
// In barba.hooks.after() or transition.after()
barba.hooks.after(function (data) {
  // Defensively re-persist in case new page HTML included nav inside container
  persistOutsideContainer(['nav', '.layout_nav_wrap', 'footer', '.layout_transition_wrap']);
  persistTransitionOverlay();
});
```

### Pattern 4: Webflow IX2 Throttled Reinit
**What:** Reinitialize Webflow interactions without double-applying initial states
**When to use:** In `beforeEnter` hook to prepare new page interactions
**Example:**
```javascript
// Source: core.js lines 594-618
function reinitWebflowIX2() {
  var Webflow = window.Webflow;
  if (!Webflow) return;

  // Throttle: IX2 init is NOT idempotent, causes flicker if called multiple times
  if (WFApp._ix2ReinitLock) return;
  WFApp._ix2ReinitLock = true;
  setTimeout(function () { WFApp._ix2ReinitLock = false; }, 0);

  Webflow.destroy();
  Webflow.ready();
  if (Webflow.require) {
    var ix2 = Webflow.require('ix2');
    if (ix2 && ix2.init) ix2.init();
  }
}
```

### Anti-Patterns to Avoid
- **Setting container `display:none` before reveal**: Causes visible gap if overlay removal happens first. Use opacity instead.
- **Killing all ScrollTriggers globally**: Destroys nav/footer scroll effects that should persist.
- **Calling Webflow.destroy/ready multiple times per hook**: Causes double animations and flicker.
- **Using `sync: true` without understanding implications**: Both pages render simultaneously, doubling layout cost.
- **Forcing `display:block` on containers**: Overrides flex/grid layouts, causes reflow.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Page transition animations | Custom fetch + replace | Barba.js | Handles caching, hooks, lifecycle, browser history |
| Scroll-based animations | IntersectionObserver loops | GSAP ScrollTrigger | Performant, handles resize/refresh, rich API |
| Animation sequences | setTimeout chains | GSAP Timeline | Precise timing, reversible, pause/resume |
| Element persistence | Clone + sync state | DOM relocation (insertBefore) | Native browser move, no state sync needed |
| Menu open/close state | Cookie/localStorage | In-memory state + persistent DOM | Instant, no serialization overhead |

**Key insight:** Barba's hook system is the correct abstraction for lifecycle management. Custom navigation solutions inevitably reinvent Barba's edge case handling (back button, prefetch, cache invalidation, simultaneous clicks).

## Common Pitfalls

### Pitfall 1: Late DOM Relocation
**What goes wrong:** Moving nav outside container AFTER Barba.init() has no effect because Barba has already cached the initial page structure. On first navigation, Barba restores the cached HTML, which includes nav inside the container, then swaps it out.
**Why it happens:** Intuition says "run persistence code inside Barba hooks," but hooks execute during navigation, not at startup.
**How to avoid:** Move persistent elements BEFORE calling `barba.init()`. Verify with DevTools that nav is outside container before clicking any links.
**Warning signs:** Nav works on initial load, disappears on first internal navigation.

### Pitfall 2: Global ScrollTrigger Cleanup
**What goes wrong:** Using `ScrollTrigger.getAll().forEach(t => t.kill())` destroys nav/footer scroll effects that should persist across pages.
**Why it happens:** Natural assumption that "everything in the old page should be cleaned up."
**How to avoid:** Check if trigger's element or animation targets are inside the outgoing container before killing. Use `container.contains(triggerElement)` check.
**Warning signs:** Nav scroll effects (backdrop blur, hide on footer) stop working after first navigation.

### Pitfall 3: Container Visibility Race Condition
**What goes wrong:** Briefly visible blank screen or "gap" between overlay clearing and container becoming visible.
**Why it happens:** Multiple async operations (waitForPaint, IX2 init, overlay fade) can complete in different orders depending on browser/timing.
**How to avoid:**
1. Fade container to opacity:1 UNDER the overlay (before columns animate out)
2. Use waitForPaint() to ensure browser has painted the container before hiding overlay
3. Hide overlay with fade (120ms) instead of instant display:none
**Warning signs:** 1-2 frame flash of white/background color during transitions.

### Pitfall 4: Menu State Loss
**What goes wrong:** Menu opens, user navigates, menu is now stuck open or closed with wrong button state.
**Why it happens:** Menu DOM persists but Barba navigation can reset event listeners or lose timeline state if menu code re-initializes.
**How to avoid:**
1. Initialize menu ONCE in global.initOnce(), never in afterEnter
2. Close menu in beforeLeave hook (before navigation starts)
3. Use global event delegation, not per-page bindings
**Warning signs:** Menu toggle stops responding after navigation, or menu state desyncs from button icon.

### Pitfall 5: Webflow IX2 Double Animation
**What goes wrong:** Elements animate twice on page enter (e.g., fade in twice, scroll triggers fire immediately).
**Why it happens:** Calling `Webflow.destroy()` + `Webflow.ready()` + `ix2.init()` multiple times in the same hook execution.
**How to avoid:** Throttle IX2 reinit with a lock flag (see Pattern 4). Call only in beforeEnter, never in enter or after.
**Warning signs:** Elements "jump" or animate from wrong starting state, scroll animations trigger without scrolling.

## Code Examples

Verified patterns from official sources and codebase:

### Barba Hook Lifecycle (sync: false, default)
```javascript
// Source: https://barba.js.org/docs/advanced/hooks/
barba.init({
  sync: false, // Default: leave completes BEFORE enter starts
  transitions: [{
    name: 'default',

    // INITIAL LOAD ONLY
    async once(data) {
      // Current page is visible, transition overlay covering it
      // Use case: First-load animation (logo reveal, etc.)
    },

    // EVERY NAVIGATION
    async beforeLeave(data) {
      // Old page still visible, new page not fetched yet
      // Use case: Close menus, save scroll position
    },

    async leave(data) {
      // Old page visible, new page fetched
      // Use case: Play leave animation (overlay covers screen)
      await animateOverlayIn();
    },

    async afterLeave(data) {
      // Old page hidden under overlay, about to be removed from DOM
      // Use case: Kill ScrollTriggers, unmount controllers
      killScrollTriggersIn(data.current.container);
    },

    async beforeEnter(data) {
      // New page in DOM but hidden, old page removed
      // Use case: Reinit Webflow IX2, prepare new page
      reinitWebflowIX2();
    },

    async enter(data) {
      // New page ready to reveal, still under overlay
      // Use case: Play enter animation (overlay clears)
      await animateOverlayOut(data.next.container);
    },

    async afterEnter(data) {
      // New page fully visible, overlay gone
      // Use case: Re-bind event listeners, refresh ScrollTrigger
      ScrollTrigger.refresh();
    },

    async after(data) {
      // Transition complete, new page is "current"
      // Use case: Final cleanup, analytics
    }
  }]
});
```

### Safe Menu Close Before Navigation
```javascript
// Source: core.js lines 694-713
barba.hooks.beforeLeave(function () {
  // Close menu with animation, but force-close if timeline is active/stuck
  if (WFApp.global && WFApp.global.closeMenu) {
    WFApp.global.closeMenu({ immediate: false, forceAfterMs: 450 });
  }
});
```

### Scroll Lock Without Layout Reflow
```javascript
// Source: core.js lines 195-236
// Problem: Toggling overflow:hidden on <html> causes visible reflow/gap
// Solution: Cancel scroll events instead of changing CSS

function lockBody() {
  if (WFApp._scrollLocked) return;
  WFApp._scrollLocked = true;

  var prevent = function (e) {
    e.preventDefault();
    return false;
  };

  var onKey = function (e) {
    var scrollKeys = [' ', 'PageDown', 'PageUp', 'Home', 'End',
                      'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
    if (scrollKeys.includes(e.key)) {
      e.preventDefault();
      return false;
    }
  };

  // Use capture + passive:false so preventDefault works
  document.addEventListener('wheel', prevent, { passive: false, capture: true });
  document.addEventListener('touchmove', prevent, { passive: false, capture: true });
  document.addEventListener('keydown', onKey, { passive: false, capture: true });
}
```

### Wait for Browser Paint (Double rAF)
```javascript
// Source: core.js lines 584-592
// Use case: Ensure DOM + Webflow IX2 initial states are painted before revealing

function waitForPaint() {
  return new Promise(function (resolve) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        resolve();
      });
    });
  });
}

// Usage in hooks:
async enter(data) {
  await waitForPaint(); // Let new DOM paint
  reinitWebflowIX2();
  await waitForPaint(); // Let IX2 initial states paint
  // Now safe to reveal
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Barba v1 `.Pjax` | Barba v2 `barba.init()` | 2020 | Promise-based hooks, better TypeScript support |
| jQuery `.load()` | Barba.js | 2015-2016 | Proper history management, prefetch, caching |
| GSAP v2 TweenMax | GSAP v3 gsap.to() | 2019 | Smaller bundle, modern API, better performance |
| Webflow IX1 | Webflow IX2 | 2018 | More powerful, but requires manual reinit with Barba |
| ScrollMagic | GSAP ScrollTrigger | 2020 | Native GSAP integration, better performance |

**Deprecated/outdated:**
- `data-no-barba`: Use `data-barba-prevent` instead (Barba v2)
- `Barba.Pjax.start()`: Use `barba.init()` (Barba v2)
- `Webflow.destroy()` + `Webflow.ready()` for IX1: Use `Webflow.require('ix2').init()` for IX2
- Global `ScrollTrigger.refresh()` in every hook: Only needed in `after` hook

## Open Questions

1. **Why does the existing `persistOutsideContainer()` code fail?**
   - What we know: Code exists at core.js lines 623-651, runs in init() before barba.init()
   - What's unclear: Is it running too late? Are elements being re-inserted? Is Webflow structure different than expected?
   - Recommendation: Add debug logging, inspect DOM before/after persistence, verify with `data-barba` structure in DevTools

2. **Are there multiple nav instances or wrappers?**
   - What we know: Code searches for `nav`, `.w-nav`, `.navbar`, `.nav`, `.layout_nav_wrap`
   - What's unclear: Does Webflow export multiple nav elements? Are we moving the wrong one?
   - Recommendation: Use `querySelectorAll()` and move ALL matches, or use the most specific selector only

3. **Is the transition overlay being recreated on each page?**
   - What we know: `persistTransitionOverlay()` moves it to `document.body`
   - What's unclear: Do fetched pages include a duplicate overlay in their HTML?
   - Recommendation: Check if `next.html` includes `.layout_transition_wrap`, remove it from source pages

4. **Do ScrollTriggers targeting persistent elements survive navigation?**
   - What we know: Nav scroll effects defined in `initNavScrollTriggersOnce()`
   - What's unclear: Are they being killed by container cleanup? Do they need re-init after navigation?
   - Recommendation: Log ScrollTrigger count before/after navigation, verify triggers persist

## Sources

### Primary (HIGH confidence)
- [Barba.js Official Docs - Markup](https://barba.js.org/docs/getstarted/markup/) - Wrapper/container structure
- [Barba.js Official Docs - Strategies](https://barba.js.org/docs/advanced/strategies/) - Prevent attribute usage
- [Barba.js Official Docs - Hooks](https://barba.js.org/docs/advanced/hooks/) - Lifecycle execution order
- [Barba.js Official Docs - Transitions](https://barba.js.org/docs/advanced/transitions/) - Sync mode behavior
- Codebase: dist/core.js (lines 1-956) - Current implementation
- Codebase: dist/global.js (lines 1-990) - Menu and global behaviors

### Secondary (MEDIUM confidence)
- [GSAP Forums - Barba.js transitions kills ScrollTrigger](https://gsap.com/community/forums/topic/31660-barba-js-transitions-kills-scrolltrigger/) - Cleanup patterns
- [GSAP Forums - How to only kill ScrollTriggers within a certain container](https://gsap.com/community/forums/topic/25316-how-to-only-kill-scrolltriggers-within-a-certain-container/) - Selective cleanup
- [Codrops - Building a Scroll-Revealed WebGL Gallery](https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/) - Modern Barba + GSAP patterns (2026)
- [Webflow Forum - Barba.js + Updating Navbar and Footer current link status](https://discourse.webflow.com/t/barba-js-updating-navbar-and-footer-current-link-status/252871) - Webflow-specific issues
- [Webflow Forum - Reinitialize Webflow IX2](https://discourse.webflow.com/t/reinitialize-webflow-ix2/51094) - IX2 reinit patterns

### Tertiary (LOW confidence)
- [LogRocket Blog - Create smooth page transitions with Barba.js](https://blog.logrocket.com/create-smooth-page-transitions-barba-js/) - General tutorial
- [CreativesFeed - How to Add Barba.js Page Transitions](https://creativesfeed.com/add-barba-js-to-website/) - Basic setup guide

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Barba v2 + GSAP + Webflow is well-documented, current codebase matches
- Architecture: HIGH - Official Barba docs + verified codebase patterns + GSAP community patterns
- Pitfalls: HIGH - Directly observed in codebase, validated by community forum discussions
- Root cause analysis: MEDIUM - Existing code should work, need to investigate WHY it fails

**Research date:** 2026-02-08
**Valid until:** 30 days (Barba/GSAP stable, Webflow IX2 stable)
