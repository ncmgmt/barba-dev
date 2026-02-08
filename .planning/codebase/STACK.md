# Technology Stack

**Analysis Date:** 2026-02-08

## Languages

**Primary:**
- JavaScript (ES5/ES6) - All application code

**Target Environment:**
- Browser/Client-side only
- No Node.js/server-side runtime

## Runtime

**Environment:**
- Browser (Chrome, Firefox, Safari, Edge)
- Webflow design/hosting platform

**Package Manager:**
- None - No package.json exists
- Lockfile: Not applicable

## Frameworks

**Core:**
- Barba.js (`@barba/core`, UMD) - Page transition library
  - Provides: Soft page navigation, hook system (beforeLeave, beforeEnter, after), DOM swapping

**Animation & DOM:**
- GSAP (optional, loaded separately) - Animation library
  - Provides: Timeline-based animations, easing
  - Optional: Only loaded if available in Webflow
- ScrollTrigger (optional, GSAP extension) - Scroll-based animations
  - Provides: Scroll-triggered animation framework

**UI Components:**
- SplitType (0.3.4, loaded per-page) - Text splitting utility
  - CDN: `https://cdn.jsdelivr.net/npm/split-type@0.3.4/umd/index.min.js`
  - Usage: `dist/pages/Home.js`, `dist/pages/Team.js` - Character/word/line splitting

- Swiper (11.x, loaded per-page) - Carousel/slider library
  - CSS: `https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css`
  - JS: `https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js`
  - Usage: `dist/pages/Home.js` - Image and content carousels

**Webflow Integration:**
- Webflow (native) - CMS platform, design tool
  - Provides: DOM structure, layout engine, built-in interactions
  - Requires: Re-initialization of Webflow interactions after Barba page swaps
  - Hook: `Webflow.require('ix2')` for interaction manager

## Configuration

**Environment:**
- Window-scoped global configuration object: `CONFIG` in `dist/core.js` (lines 18-60)
- Webflow configuration via `window.WFAPP_*` overrides

**Configuration Variables:**
- `window.WFAPP_REVEAL_DELAY_MS` - Legacy reveal delay override (milliseconds)
- `window.WFAPP_REVEAL_DELAY_MS_INITIAL` - Initial load reveal delay (500ms default)
- `window.WFAPP_REVEAL_DELAY_MS_INTERNAL` - Internal navigation reveal delay (500ms default)
- `window.WFAPP_CDN_BASE` - Page controller CDN base URL (default: jsDelivr GitHub raw)

**Core Configuration:**
- `debug: true` - Console logging toggle
- `readyTimeoutMs: 4000` - Page readiness gate timeout
- `transitionWrapSelector: '.layout_transition_wrap'` - Animation wrapper element
- `transitionColumnSelector: '.layout_column_el'` - Column animation elements
- `logoWrapSelector: '.logo_wrap'` - Logo animation element
- `fadeContainSelector: '[data-transition-contain="fade"]'` - Fade transition container
- `contentWrapSelector: '.content_wrap'` - Content wrapper
- `transitionOffset: 0` - Leave animation to DOM swap delay
- `namespaces: ['Home', 'Portfolio', 'Team', 'Insights', 'Contact', 'Imprint', 'Legal', 'PrivacyPolicy', 'Summit']` - Valid page namespaces

## Build & Deployment

**Build Process:**
- No build step - All code is pre-compiled/transpiled to ES5 UMD format
- Source files compiled to `dist/` directory
- Distributed via jsDelivr CDN from GitHub repository

**Deployment:**
- GitHub-based distribution via jsDelivr CDN
- Core: `https://cdn.jsdelivr.net/gh/ncmgmt/barba-dev@main/dist/core.js`
- Pages: `https://cdn.jsdelivr.net/gh/ncmgmt/barba-dev@main/dist/pages/{Namespace}.js`
- Can pin to git tags instead of `@main` for cache safety

**Integration Method:**
- Loaded globally via Webflow **Site Settings** custom code
- No bundler required - Scripts load directly in browser

## External Script Loading

**Dynamic Loading:**
- Implemented via `WFApp.loadScriptOnce(src)` in `dist/core.js` - Loads external scripts with deduplication
- Implemented via `WFApp.loadCssOnce(href)` in `dist/core.js` - Loads external stylesheets with deduplication

**Loading Strategy:**
- Per-page dependencies loaded dynamically on namespace init
- Set-based tracking: `WFApp._loadedScripts` (Set) prevents duplicate loads
- Promise-based API for async/await compatible code

## Client-Side Storage

**Session Storage:**
- `logoAnimated` - Boolean flag tracking if logo reveal animation ran (persists across page transitions)
- Usage: Prevents logo animation on subsequent page navigations

**Local Storage:**
- Not currently used

**IndexedDB/Databases:**
- None

## Platform Requirements

**Development:**
- Text editor or Webflow visual designer
- Git for version control
- No build tools required

**Production (Webflow):**
- Modern browser with ES5 JavaScript support
- CORS access to jsDelivr CDN
- SessionStorage support (browser feature)
- GSAP optionally loaded via Webflow (not required)
- Webflow hosting and design environment

**Browser Compatibility:**
- ES5 syntax - IE11+ and all modern browsers
- Uses standard DOM APIs (querySelector, addEventListener, etc.)
- CSS transitions and transforms (no polyfills)

---

*Stack analysis: 2026-02-08*
