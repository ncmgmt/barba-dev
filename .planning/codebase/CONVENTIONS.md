# Coding Conventions

**Analysis Date:** 2026-02-08

## Naming Patterns

**Files:**
- Page controllers: PascalCase (e.g., `Home.js`, `Portfolio.js`)
- Utility files: lowercase-with-hyphens (e.g., `gsd-tools.js`)
- Template/shared: _template.js, global.js

**Functions:**
- camelCase for function names: `initHomeAnimations`, `animateEnter`, `onTransition`, `addHoverAndClickEffect`
- Private helper functions: camelCase with leading underscore semantically (no actual underscore): `createReadyGate`, `getNamespace`, `killScrollTriggersIn`
- Anonymous functions in callbacks: often arrow functions or explicit `function` declarations

**Variables:**
- camelCase: `container`, `nextContainer`, `readyToken`, `imageSwiper`, `contentTimer`
- Boolean flags with positive logic: `isOpen`, `hasAnimated`, `blocksCreated`, `didInit`
- State objects: lowercase with underscores for private module state: `_freezeState`, `_scrollLocked`, `_menuInstances`
- Abbreviations accepted: `ctx` (context), `el` (element), `ms` (milliseconds), `px` (pixels), `tl` (timeline), `qsa` (querySelectorAll), `qs` (querySelector), `mm` (matchMedia), `st` (scroll triggers)

**Types/Classes:**
- Constructor functions use PascalCase: `new window.Swiper()`, `new window.SplitType()`
- Namespace objects: PascalCase: `WFApp`, `ScrollTrigger`, `GSAP`

## Code Style

**Formatting:**
- Strict mode: `'use strict';` at top of each IIFE
- IIFEs (Immediately Invoked Function Expressions) as module pattern for encapsulation
- Semicolons required at statement ends
- 2-space indentation (observed in most files)
- Spaces around operators: `foo === 'bar'`, `x + y`
- No trailing commas in object literals or arrays

**Linting:**
- No detected eslint/prettier configuration files in repo
- Code follows vanilla JavaScript conventions (ES5 compatible)
- Defensive programming: extensive try-catch blocks around DOM operations

## Import Organization

**Pattern:**
Files use global scope + IIFE closure rather than ES6 imports/exports:
```javascript
(function () {
  'use strict';
  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};
  // ... module code
})();
```

**Script Loading:**
- Dynamic CDN loading via `WFApp.loadScriptOnce(src)` and `WFApp.loadCssOnce(href)`
- External deps loaded on-demand in controllers: Swiper, SplitType, GSAP, ScrollTrigger
- No bundler; relies on browser globals from UMD builds

**Path Aliases:**
- No path aliases; absolute CDN URLs for external libraries
- Relative file references not used (global script model)

## Error Handling

**Patterns:**
- Defensive try-catch blocks wrap risky DOM operations: `try { el.remove(); } catch (_) {}`
- Swallow errors silently with empty catch (`catch (_) {}`)
- Early returns on null/undefined checks: `if (!el || !window.gsap) return`
- Null checks with defensive operators: `el && el.addEventListener`, `root || document`
- Promise-based operations with `.catch()` or `Promise.race()` timeouts

**Examples:**
```javascript
// Defensive DOM access
try {
  wrapper.style.minHeight = Math.ceil(r.height) + 'px';
} catch (_) {}

// Early return guards
function deleteInstance(ns) {
  if (!ns) return;
  var old = instances[ns];
  if (old && typeof old.destroy === 'function') {
    try { old.destroy(); } catch (_) {}
  }
}

// Promise timeout fallback
await Promise.race([readyPromise, delay(CONFIG.readyTimeoutMs)]);
```

## Logging

**Framework:** console (no custom logger)

**Patterns:**
- Conditional logging via CONFIG.debug flag
- Function `log()` wraps console.log with debug check: `if (!CONFIG.debug) return`
- Warnings via `warn()` function that always fires (no CONFIG check)
- Limited console usage; mostly in core.js for Barba lifecycle events

**When to Log:**
```javascript
function log() {
  if (!CONFIG.debug) return;
  try { console.log.apply(console, arguments); } catch (_) {}
}

// Usage:
log('[WFApp] mounted', ns);
log('[WFApp] core initialized');
```

## Comments

**When to Comment:**
- JSDoc not used; inline comments explain non-obvious logic
- Block comments explain complex algorithms: logo animation, decode effect, blocks background
- Warn comments for gotchas: "Keep overlay visible until", "Do NOT clear to ''", "IMPORTANT:"

**Examples:**
```javascript
// Keep in DOM and visible immediately.
wrap.style.display = 'flex';

// IMPORTANT: scroll reset must happen while the overlay covers the page.
// Doing it too early causes a visible jump.

// Ensure correct first-load state
var hasAnimated = sessionStorage.getItem('logoAnimated') === 'true';
```

## Function Design

**Size:** Functions range from 5-50 lines typically; complex animations can exceed 100 lines with proper nesting

**Parameters:**
- Usually positional (not destructured) for vendor lib compatibility
- Default parameters via assignment in function body: `if (useBlocks === void 0) useBlocks = true`
- Options objects for GSAP/Swiper config: `{ opacity: 0, duration: 1.5, ease: 'power2.inOut' }`

**Return Values:**
- Explicit returns preferred
- Promise-based for async operations: `return new Promise(function (resolve) { ... })`
- Returned objects with destroy/revert methods for lifecycle: `return { destroy: function () { ... } }`
- Objects expose public API: `{ token: gateLock, promise: gatePromise }`

**Async Pattern:**
```javascript
async function initSwipers() {
  if (WFApp.loadCssOnce) await WFApp.loadCssOnce(swiperCss);
  await WFApp.loadScriptOnce(swiperJs);
  // initialization logic
}
```

## Module Design

**Exports:**
- Register to global namespace: `window.WFApp.pages.Home = { init: function ... }`
- Controllers export `init(args)` function and optionally `destroy()`
- Global object stores instances: `WFApp._instances[ns] = instance`

**Barrel Files:**
- No barrel files; each page is a separate script file
- Core.js (`dist/core.js`) is the entry point for Barba setup

**Encapsulation:**
- IIFE closures create private scope
- Cleanup via destroy() callbacks for listener removal, timeline kills, observer disconnects
- State isolated per-namespace in `WFApp._instances`

**Example Module:**
```javascript
(function () {
  'use strict';
  var WFApp = (window.WFApp = window.WFApp || {});
  WFApp.pages = WFApp.pages || {};

  WFApp.pages.Portfolio = {
    init: function ({ container, namespace }) {
      var ctx = null;
      var listeners = [];

      // Setup
      function on(el, event, fn) {
        el.addEventListener(event, fn);
        listeners.push([el, event, fn]);
      }

      // Cleanup
      return {
        destroy: function () {
          listeners.forEach(function (x) {
            try { x[0].removeEventListener(x[1], x[2]); } catch (_) {}
          });
          if (ctx) { try { ctx.revert(); } catch (_) {} }
        }
      };
    }
  };
})();
```

## Special Patterns

**Page Readiness Gate:**
- Controllers signal ready via `WFApp.ready.signal(token)`
- Token prevents race conditions between navigation cycles
- Core waits for signal or timeout before revealing next page

**GSAP Context Cleanup:**
- Use `gsap.context(fn, container)` to scope ScrollTriggers
- Store context in closure variable: `ctx = window.gsap.context(...)`
- Revert in destroy: `ctx.revert()` kills all nested animations/triggers

**WeakMap for Private Data:**
- Used for attaching internal state to DOM elements without pollution
- Example: `highlightTimeouts = container.__bwBlockHighlightTimeouts || new WeakMap()`

---

*Convention analysis: 2026-02-08*
