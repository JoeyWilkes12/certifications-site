# Portfolio theme verification

The theme ports Joey’s existing portfolio system into the certification gallery. The verified GitHub source is `JoeyWilkes12/personal-websites`, branch `replit/autoscale-2026-10-03-v1.0.1`, app `2026-10-03_v1.0.1`, commit `85e31d8565dd1a5458416537fdab7ab70758a075`. The release’s Replit adapter identifies the supplied public portfolio origin. All 110 token declarations match the live stylesheet after minification normalization. The public deployment does not disclose its exact running commit.

The certification work starts from `origin/main` at `fad6a8859dffb43a9223602ae7b5ea3435a50919`, including the latest touch-swipe changes. `app.js`, `styles.css`, credential JSON, original artwork and all 19 LinkedIn PDFs remain unchanged. The theme loads as two additional stylesheets on the homepage and every credential page; `theme.js` changes only the browser theme-color values.

| Verification | Result |
| --- | --- |
| Upstream source hash, exact namespacing, all 18 stylesheet paths | Pass |
| 19 PDF hashes, primary/secondary record counts, personal ratings, JSON parity | Pass |
| Original artwork and completion-date callbacks: 1440px Chromium / 390px iPhone WebKit | Pass |
| Reel swipe: desktop native mouse / WebKit synthetic pointer logic | Pass |
| Native Chromium touch: swipe, wrapping, artwork tap, vertical scroll | Pass |
| Learning collection: 36 records, independent search, disclosures, PDF responses, ratings | Pass |
| Theme: both OS defaults, explicit preference across reload/details/return, all 17 front cards per theme, no horizontal overflow | Pass |
| Contrast: 72 rendered probes per viewport, including focused controls and status chips | Pass; normal-text minimum 4.728:1 |
| Motion: original halo pulse/rotation and reduced-motion pause | Pass |
| No JavaScript: both themes, 123 static record text nodes, native LinkedIn disclosure/PDF, original artwork and detail return | Pass |
| Denied browser storage: usable light/dark toggle, reload, navigation | Pass |
| Full hyperlink check, including new theme assets | 222/223 pass; unchanged FinOps issuer source returns HTTP 403 |
| Fresh visual/code review and select-spacing verdict | Ship; no remaining material findings |

The mobile select uses `appearance: none` because WebKit’s native skin overrode the 44px minimum and rendered at 20px. The native select element, popup and events remain; a noninteractive chevron has reserved label space. Screenshot review confirms the final gap in both mobile themes.

WebKit’s swipe test dispatches synthetic pointer events and does not prove native Safari gesture arbitration. The separate Chromium touch run uses trusted CDP touch input and proves native vertical scrolling. The iPhone WebKit theme/resilience sessions retain the mobile user agent, pixel ratio, viewport and touch capability, and use real taps for native disclosures and navigation.

All application links are checked through their redirect chains and expected content, without allowlists or pass overrides. The final full run passed 222 of 223 checks, including every internal destination and resource. The unchanged FinOps for AI issuer source returns HTTP 403 to the HTTP checker and remains a reported failure. A transient PDF extraction timeout in the first full run passed its targeted retry and the final full run.

Playwright results, original portfolio reference captures, review reports and screenshots stay under ignored `output/playwright/`. The pull request includes selected image evidence; production remains on the existing main branch until the user approves the specific PR for merging.
