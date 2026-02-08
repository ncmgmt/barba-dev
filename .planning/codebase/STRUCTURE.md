# Codebase Structure

**Analysis Date:** 2026-02-08

## Directory Layout

```
barba-dev/
├── dist/                      # Compiled/distribution output (served via CDN)
│   ├── core.js               # Main Barba initialization & transition orchestration
│   ├── global.js             # Persistent global behaviors & helpers
│   └── pages/                # Per-namespace page controllers
│       ├── _template.js      # Template for new page controllers
│       ├── default.js        # Fallback controller for unknown namespaces
│       ├── Home.js
│       ├── Portfolio.js
│       ├── Team.js
│       ├── Insights.js
│       ├── Contact.js
│       ├── Imprint.js
│       ├── Legal.js
│       ├── PrivacyPolicy.js
│       └── Summit.js
├── .planning/                # Claude Code planning & analysis
│   └── codebase/            # Codebase documentation (this directory)
├── .claude/                  # Claude Code metadata & config
│   ├── settings.json
│   ├── gsd-file-manifest.json
│   ├── commands/            # GSD command definitions
│   ├── agents/              # Claude agent scripts
│   └── get-shit-done/       # GSD framework templates
├── research/                # Reference materials & playbooks
├── README.md                # Project overview & Webflow integration guide
└── claude.md                # Claude Code project instructions

```

## Directory Purposes

**`dist/`:**
- Purpose: Distribution-ready JavaScript files served via jsDelivr CDN
- Contains: Core transition logic, page controllers, global helpers
- Key files: `core.js` (must load first), `pages/` (lazy-loaded by core), `global.js` (optional)
- Naming: Controllers match Webflow namespace names (PascalCase)

**`dist/pages/`:**
- Purpose: Namespace-specific page initialization controllers
- Contains: GSAP animations, event listeners, library imports, DOM mutations scoped to container
- Key files: `_template.js` (reference pattern), `default.js` (fallback)
- Convention: One file per namespace; file names must match `WFApp.pages[Namespace]` key

**`.planning/codebase/`:**
- Purpose: Claude Code analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Contains: Technical documentation for future Claude instances
- Committed: Yes (excludes secrets, focuses on patterns & guidance)

**`.claude/`:**
- Purpose: Claude Code framework configuration & agent scripts
- Generated: Mostly yes (by Claude Code CLI)
- Committed: Mixed (settings.json yes, agent outputs may not be)

**`research/`:**
- Purpose: Reference implementations and playbooks from parent project
- Contents: Examples, patterns from bw24 migration source
- Not deployed: Yes

## Key File Locations

**Entry Points:**
- `dist/core.js`: Barba bootstrap & transition management (load first, globally in Webflow)
- `dist/pages/<Namespace>.js`: Per-page controller init (lazy-loaded by core on navigation)
- `dist/global.js`: Global persistent behaviors (optional, can be omitted if no global handlers needed)

**Configuration:**
- `dist/core.js` lines 17-60: CONFIG object (debug, readyTimeoutMs, initialRevealDelayMs, internalRevealDelayMs, cdnBase, selectors, namespaces)
- Webflow overrides: Set `window.WFAPP_*` vars before loading core.js (e.g., `window.WFAPP_REVEAL_DELAY_MS_INITIAL = 500`)

**Core Logic:**
- `dist/core.js` lines 152-456: Transition animations (animateLeave, animateEnter, logoAnimationOnce)
- `dist/core.js` lines 481-535: Controller lifecycle (mountNamespace, unmountNamespace, controllerUrlForNamespace)
- `dist/core.js` lines 669-950: Barba hook definitions (once, leave, beforeEnter, enter, after)

**Testing:**
- Not detected (no test files in dist or source)
- Controllers must be manually tested in Webflow by navigating between pages
- Ready signal timing tested via console logs when `CONFIG.debug = true`

## Naming Conventions

**Files:**
- Controllers: `PascalCase.js` (e.g., `Home.js`, `Portfolio.js`)
- Utilities: `camelCase.js` (e.g., `core.js`, `global.js`)
- Templates: `_prefix.js` (e.g., `_template.js`)

**Directories:**
- Feature folders: `lowercase` (e.g., `pages/`, `dist/`)
- Namespace grouping: Each namespace gets one file in `pages/`, no subdirectories

**Functions & Variables:**
- Private (scoped to IIFE): `camelCase` (e.g., `animateLeave()`, `mountNamespace()`)
- Public (on WFApp): `camelCase` (e.g., `WFApp.ready.signal()`, `WFApp.loadScriptOnce()`)
- Config constants: `UPPER_CASE` (e.g., `CONFIG`, `WFApp._freezeState`)

**Types & Classes:**
- Not used (vanilla JS, no class-based architecture)

## Where to Add New Code

**New Page Namespace:**
1. Create `dist/pages/<NewNamespace>.js` following pattern in `dist/pages/_template.js`
2. Register controller: `WFApp.pages.<NewNamespace> = { init({ container, namespace, data }) { ... } }`
3. Add namespace to whitelist in `CONFIG.namespaces` in `dist/core.js` (line 59)
4. If using GSAP: Wrap init in `gsap.context(() => { ... }, container)` and return `{ destroy() { ctx.revert() } }`
5. All DOM queries must use `container` as root: `container.querySelector('[data-x]')`
6. Call `WFApp.ready.signal(WFApp.ready.token)` when page DOM is stable and animations can start

**Global Persistent Behavior:**
1. Add function to `dist/global.js`
2. Register on `WFApp.global` object
3. Call from core hooks: `WFApp.global.functionName()` (core already calls `initOnce()`, `afterEnter()`, `closeMenu()`)

**New Transition Animation:**
1. Add animation function to `dist/core.js` (follow `animateLeave`/`animateEnter` pattern)
2. Return Promise that resolves when animation is done
3. Call from appropriate Barba hook (leave, beforeEnter, enter, after)
4. Ensure scroll is locked during leave-enter sequence (via `lockBody()`/`unlockBody()`)

**External Library Dependencies:**
1. Use `WFApp.loadScriptOnce(url)` to load JS libraries (prevents duplicates)
2. Use `WFApp.loadCssOnce(href)` to load stylesheets (prevents duplicates)
3. Store references: `const scriptUrl = 'https://cdn.jsdelivr.net/...'`
4. Load early in controller.init() or during page transition setup

## Special Directories

**`dist/`:**
- Purpose: Distribution output (deployed to jsDelivr CDN)
- Generated: No (hand-written, but could be built from source)
- Committed: Yes (serves as source of truth for deployed code)

**`.claude/commands/gsd/`:**
- Purpose: Claude Code framework command definitions
- Generated: By Claude Code CLI during setup
- Committed: Yes (shared with team)

**`.planning/codebase/`:**
- Purpose: Living documentation for future Claude instances
- Generated: By Claude Code agents (this process)
- Committed: Yes (acts as reference for /gsd:plan-phase and /gsd:execute-phase)

## Import & Module Resolution

**Module System:** None (vanilla JS, loaded via `<script>` tags in Webflow)

**Dependency Ordering:**
1. `@barba/core` UMD (Barba router)
2. `gsap` UMD (animation library, optional)
3. `ScrollTrigger` plugin (if using ScrollTrigger, optional)
4. `dist/core.js` (our main orchestrator, auto-calls `barba.init()`)
5. `dist/global.js` (optional, called by core if present)
6. `dist/pages/<Namespace>.js` (lazy-loaded by core on navigation)

**Global Registry Cascade:**
- Core creates `window.WFApp` if missing
- Controllers register on `window.WFApp.pages[Namespace]`
- Global handler registers on `window.WFApp.global`
- Instance storage in `window.WFApp._instances[Namespace]`

---

*Structure analysis: 2026-02-08*
