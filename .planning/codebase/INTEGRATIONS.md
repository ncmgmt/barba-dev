# External Integrations

**Analysis Date:** 2026-02-08

## CDN & Content Delivery

**jsDelivr:**
- Core library distribution
  - Core: `https://cdn.jsdelivr.net/gh/ncmgmt/barba-dev@main/dist/core.js`
  - Page controllers: `https://cdn.jsdelivr.net/gh/ncmgmt/barba-dev@main/dist/pages/{Namespace}.js`
- Per-page dependencies (SplitType, Swiper, etc.)
- Configurable via `window.WFAPP_CDN_BASE` override before core.js load

**npm CDN (via jsDelivr):**
- SplitType 0.3.4: `https://cdn.jsdelivr.net/npm/split-type@0.3.4/umd/index.min.js`
  - Used in: `dist/pages/Home.js`, `dist/pages/Team.js`
  - Purpose: Text splitting (characters/words/lines)

- Swiper 11:
  - CSS: `https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css`
  - JS: `https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js`
  - Used in: `dist/pages/Home.js`
  - Purpose: Image carousel and content carousel implementation

## JavaScript Libraries

**Barba.js (@barba/core):**
- Status: Required
- Load method: UMD script tag in Webflow Site Settings
- Usage: `dist/core.js` initializes and configures Barba routing
- Integration points:
  - Hook: `barba.hooks.beforeLeave()` - Prepare for page exit
  - Hook: `barba.hooks.beforeEnter()` - Prepare for new page content
  - Hook: `barba.hooks.after()` - Execute after DOM swap complete
  - Init: `barba.init({ ... })` with custom rules and transitions

**GSAP (GreenSock Animation Platform):**
- Status: Optional
- Load method: External script loaded separately in Webflow
- Usage: Optional animations in page controllers and core
- Integration points:
  - Logo reveal animation: `dist/core.js` lines ~350-400
  - Transition column animation: `dist/core.js`
  - ScrollTrigger integration: Optional per-page
  - Context API: `gsap.context()` for scoped cleanup in page controllers

**ScrollTrigger (GSAP Extension):**
- Status: Optional (requires GSAP)
- Load method: Bundled with GSAP if loaded
- Usage: Optional scroll-based animations on pages
- Kill method: `ScrollTrigger.getAll().forEach(t => t.kill())` for cleanup between page transitions
- Implementation: `dist/pages/Home.js` - Example of ScrollTrigger cleanup

## Webflow Integration

**Webflow Platform:**
- CMS and design platform hosting
- Provides:
  - DOM structure and layout
  - Native interaction engine (ix2 - Webflow Interactions)
  - Asset hosting
  - CMS collections (if used)

**Webflow Interactions (ix2):**
- Access: `Webflow.require('ix2')` in `dist/core.js`
- Purpose: Re-initialize Webflow built-in interactions after Barba page swaps
- Key pattern: Must re-run after every page transition to rebind hover/click effects
- Risk: Without re-initialization, Webflow interactions become unresponsive after navigation

**Webflow Data Attributes:**
- `data-barba="wrapper"` - Persistent wrapper element (nav, footer stay here)
- `data-barba="container"` - Content area replaced on navigation (actual page content)
- `data-barba-namespace="[Namespace]"` - Page identifier for controller mounting
- Example: `<div class="content_wrap" data-barba="container" data-barba-namespace="Home">`

## Page-Specific Controllers

**Namespace Structure:**
Controllers register at `window.WFApp.pages[namespace]` and provide:
- `init({ container, namespace })` - Mount point for page-specific code
- Optional `destroy()` - Cleanup callback when leaving page

**Implemented Pages:**
- `dist/pages/Home.js` - Complex: SplitType, Swiper, GSAP, ScrollTrigger, custom reveal effects
- `dist/pages/Portfolio.js` - Swiper carousels, smooth scrolling, effect animations
- `dist/pages/Team.js` - SplitType text effects, animations
- `dist/pages/Contact.js` - Multi-step form validation, tooltips, form field state management
- `dist/pages/Insights.js` - Basic page with minimal interactions
- `dist/pages/Legal.js` - Simple content page
- `dist/pages/Imprint.js` - Simple content page
- `dist/pages/PrivacyPolicy.js` - Simple content page
- `dist/pages/Summit.js` - Basic page

**Template:**
- `dist/pages/_template.js` - Standard controller template with GSAP context cleanup pattern

## Page Readiness System

**Ready Gate Pattern:**
- Mechanism: `WFApp.ready.signal(token)` - Page signals readiness to reveal
- Purpose: Prevents reveal animation starting before DOM/CMS content fully loaded
- Timeout: 4000ms (`readyTimeoutMs`) - Falls back if no signal received
- Token-based: Ensures late signals from previous navigations don't trigger early

**Usage in Controllers:**
- Call `WFApp.ready.signal()` when page DOM is stable
- Captures `WFApp.ready.token` at init to avoid cross-navigation race conditions

## Client-Side Storage

**Session Storage:**
- Key: `logoAnimated`
- Value: `'true'` (string)
- Usage: Prevents logo animation on repeat visits and internal navigations
- Lifecycle: Session-scoped (cleared on browser close)
- Implementation: `dist/core.js` lines ~185-195

## Form Integration (Contact Page)

**Form Handling:**
- `dist/pages/Contact.js` implements multi-step form validation
- Native DOM form elements (no external form library)
- Custom validation logic for step-based workflows
- Event handling: Event listeners cleanup via `listeners` array on page destroy

**Webflow Form:**
- Expects form elements with standard HTML attributes
- Field names: First-Name, Last-Name, Email, Message, Phone-number, Company-Name, Category, Event-Name, eventWebsite, date_field
- ARIA attributes: Uses `aria-required` for accessibility

## No External Databases

**Data Storage:**
- Not applicable - Webflow CMS handles any backend/database needs
- Contact form submission: Handled by Webflow form submission (if configured)
- No direct API calls to backend in current codebase

## No Authentication

**Auth System:**
- Not implemented in barba-dev
- Webflow authentication handled separately if needed
- No API keys or secrets required in current code

## Monitoring & Observability

**Error Tracking:**
- None configured
- Debug mode: `CONFIG.debug = true` in `dist/core.js` enables console logging
- Manual logging: `log()` and `warn()` functions in core

**Logs:**
- Browser console only
- Barba transition lifecycle logged if debug enabled

## No Webhooks

**Incoming Webhooks:**
- Not implemented

**Outgoing Webhooks:**
- Not implemented
- Contact form submission would use Webflow's form submission mechanism

## Dependency Load Chain

**Expected Load Order (in Webflow Site Settings):**

1. Barba.js UMD: `@barba/core` via CDN
2. Optional: GSAP library (if using animations)
3. Optional: ScrollTrigger (if using scroll animations)
4. barba-dev core: `dist/core.js`
5. Global behaviors: `dist/global.js` (optional, for shared effects)
6. Per-page controllers: Loaded dynamically by `dist/core.js`

**Dynamic Dependencies (loaded per-page):**
- SplitType (Home, Team)
- Swiper (Home, Portfolio)
- Any custom CSS files via `WFApp.loadCssOnce(href)`

## CDN CORS Requirements

**CORS Setup:**
- jsDelivr: Public CDN, CORS enabled
- npm CDN (via jsDelivr): Public CDN, CORS enabled
- Required: No special CORS configuration needed

## Performance & Caching

**Script Deduplication:**
- `WFApp._loadedScripts` (Set) prevents reloading same script on multiple navigations
- `WFApp._loadedCss` (Set) prevents duplicate stylesheet loads
- Critical for SPA performance in Barba transitions

---

*Integration audit: 2026-02-08*
