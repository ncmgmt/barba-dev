# barba-dev

## What This Is

A Barba.js-based page transition system for a Webflow corporate site (ncmgmt). It provides smooth column-overlay transitions between pages, per-namespace controller loading from CDN, GSAP animations, a readiness gate system, and persistent global behaviors (decode effects, menu, blocks background). Deployed via jsDelivr CDN from GitHub, loaded as custom code in Webflow Site Settings.

## Core Value

Page transitions must be seamless and never break navigation or layout -- users should never see a broken nav, missing content, or a stuck overlay after any navigation path.

## Requirements

### Validated

- Nav/footer/overlay persistence outside Barba container -- existing
- Column-overlay page transition (leave + enter with GSAP) -- existing
- Per-namespace controller loading from CDN with lazy script loading -- existing
- Readiness gate (token-based semaphore) for controller init synchronization -- existing
- ScrollTrigger scoped cleanup on page leave -- existing
- Decode effect (hover + reveal-on-load) ported from bw24 -- existing
- Blocks background (data-background containers) ported from bw24 -- existing
- Menu system ported from bw24/gsap_menu.js with Barba-safe close -- existing
- Nav scroll triggers (hide on footer, backdrop blur per page) -- existing
- Logo animation on first load (sessionStorage gated) -- existing
- 9 page namespaces: Home, Portfolio, Team, Insights, Contact, Imprint, Legal, PrivacyPolicy, Summit -- existing
- Team page controller with SplitType, ScrollTrigger animations, card info toggle -- existing
- Home page controller with Swiper, SplitType, feature/portfolio sections -- existing

### Active

- [ ] Fix nav/menu disappearing after internal Barba navigation
- [ ] Integrate BWBlockReveal (bw-blockreveal.js) into global code, available via WFApp.global
- [ ] Port Team page image animation parity using blockreveal for consistent UX
- [ ] Ensure blockreveal re-runs/rebinds after Barba container swaps
- [ ] Port theme system (theme.js) -- toggle, localStorage persistence, OS preference fallback, logo variants
- [ ] Full parity audit of Home, Portfolio, Contact, Insights controllers vs bw24 originals

### Out of Scope

- New product features or pages -- this milestone is fixes and parity ports only
- Refactoring controller boilerplate into shared base class -- tech debt, defer
- Build system / bundler introduction -- current no-build CDN model is intentional
- Server-side rendering or backend work -- frontend-only system
- Lenis smooth scroll integration -- deferred
- View Transitions API -- experimental, limited browser support

## Context

- **Existing codebase**: ~956-line core.js, ~990-line global.js, 9 page controllers in dist/pages/
- **bw24 reference**: Sibling directory at ../bw24/ contains the original non-Barba scripts being ported
- **Key reference files**: bw24/bw-blockreveal.js (block reveal overlay animation), bw24/gsap_team_new.js (Team page animations)
- **Deployment**: GitHub repo ncmgmt/barba-dev, distributed via jsDelivr CDN (`@main` or pinned to commit hash)
- **Testing**: Manual testing by pasting Webflow Site Settings footer snippet with pinned jsDelivr commit hash
- **Known nav issue**: core.js already has `persistTransitionOverlay()` that tries to move nav outside container, but nav still disappears after internal navigation -- root cause needs investigation
- **Block reveal vs blocks background**: bw-blockreveal.js (grid overlay that fades out to reveal images) is different from the existing blocks.js background (decorative block grid). Both needed.

## Constraints

- **No build step**: All code must be ES5-compatible UMD, no bundler, no npm
- **CDN delivery**: Must work when loaded via jsDelivr from GitHub commit hash
- **Webflow integration**: Must not break Webflow IX2 interactions or native behaviors
- **No blind delays**: Prefer deterministic synchronization over setTimeout workarounds
- **Initial load**: Must remain smooth and unchanged; only adjust internal navigation timing if required
- **Deliverable**: Commit + push to GitHub main with new commit hash for jsDelivr pinning

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| BWBlockReveal integrated into global.js (not separate file) | Reduces script count, makes it available via WFApp.global.rebind path | -- Pending |
| Nav persistence via DOM relocation (outside container) | Webflow puts nav inside container; must move it out so Barba doesn't swap it | -- Pending |
| Team blockreveal uses same BWBlockReveal as global | Consistent UX, single implementation | -- Pending |

---
*Last updated: 2026-02-08 after roadmap creation*
