# Portfolio theme consumer

This standalone website consumes Joey’s custom **July 2026 personal website system v1.0.0**. The portfolio source is `JoeyWilkes12/personal-websites`, release branch `replit/autoscale-2026-10-03-v1.0.1`, app `2026-10-03_v1.0.1`. The verified release snapshot is `85e31d8565dd1a5458416537fdab7ab70758a075`; `provenance.json` records source URLs and the 110-token comparison with the deployed Replit stylesheet. The deployed HTML does not expose its exact running commit.

`tokens.css` and `tokens.json` retain the original values. `TOKENS.md` and `PATTERNS.md` describe the upstream theme and component contracts. `scripts/sync-portfolio-theme.mjs` generates `assets/design-system/portfolio-tokens.css` with a `--portfolio-` namespace. Namespacing prevents collisions with the original reel’s `--ink`, `--line`, and other variables; it does not alter values. The theme skin in `portfolio-theme.css` maps the existing components to these roles.

Run `node scripts/sync-portfolio-theme.mjs` after changing the vendored source. To refresh from the workspace’s canonical shared copy, pass `--source` with the absolute path to `shared-assets/design-systems/july-2026-personal-website`. Generated tokens and source files are committed, so GitHub Pages can publish this repository without the parent workspace or a build service.

The original `app.js` and `styles.css` are preserved. Typography and component skins are applied after those styles. The orbital reel retains its pinned order, dimensions, original artwork crops, timing, motion preference behavior, mouse dragging, touch swiping, filters, links, and keyboard controls.

Verification: `node tests/theme-source.mjs`, `node tests/static-content.mjs`, the existing Playwright reel/collection callbacks, and the portfolio-theme callback. The theme applies to the homepage and all 17 credential detail pages.
