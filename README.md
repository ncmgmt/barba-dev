# barba-dev

Webflow-friendly Barba.js page transitions with per-namespace (per page) script loading.

## Namespaces
- Home
- Portfolio
- Team
- Insights
- Contact
- Imprint
- Legal
- PrivacyPolicy

## How it works
- `dist/core.js` is included globally via Webflow **Site Settings**.
- Core expects your existing transition elements to exist:
  - `.layout_transition_wrap` with children `.layout_column_el`
  - `.logo_wrap` (only animates on first load, uses `sessionStorage.logoAnimated`)
- Each namespace has a controller file under `dist/pages/<Namespace>.js`.
- Controllers register themselves as `window.WFApp.pages[namespace]` and expose:
  - `init({ container, namespace })`
  - optional `destroy()` via returned instance

## Webflow markup requirements
1. Wrapper and container attributes:
   - Put `data-barba="wrapper"` on the persistent wrapper (the element that contains nav + footer + content).
   - Put `data-barba="container"` on the content element that should be replaced.
   - Put `data-barba-namespace="Home"` (etc.) on that container.

2. If your Webflow structure is:
   ```html
   <body>
     <page_main>
       <page_contain>
         <nav>...</nav>
         <content_wrap>...</content_wrap>
         <footer>...</footer>
       </page_contain>
     </page_main>
   </body>
   ```
   Then recommended:
   - `<div class="page_contain" data-barba="wrapper">` (or your existing wrapper element)
   - `<div class="content_wrap" data-barba="container" data-barba-namespace="Home">`

## CDN usage (jsDelivr)
Example:
- Core: `https://cdn.jsdelivr.net/gh/ncmgmt/barba-dev@main/dist/core.js`
- Page: `https://cdn.jsdelivr.net/gh/ncmgmt/barba-dev@main/dist/pages/Home.js`

(For cache safety you can pin to a tag instead of `@main`.)
