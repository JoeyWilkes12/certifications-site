# Joey Wilkes — Certifications

[Open the certification gallery](https://joeywilkes12.github.io/certifications-site/)

This repository contains the self-contained public website. GitHub Pages publishes the root of the main branch.

The gallery uses Joey’s custom **July 2026 personal website system v1.0.0**, shared with the Replit portfolio. The verified portfolio source is `JoeyWilkes12/personal-websites`, branch `replit/autoscale-2026-10-03-v1.0.1`, app `2026-10-03_v1.0.1`, snapshot `85e31d8565dd1a5458416537fdab7ab70758a075`. All 110 source token declarations match the deployed stylesheet; the public deployment does not disclose its exact running commit. Provenance, original tokens, patterns, and synchronization instructions are in `design-system/`.

`portfolio-theme.css` applies the portfolio’s paper/navy surfaces, gold actions, pink accents, serif headings and square controls after the original gallery stylesheet. The namespaced token snapshot is committed under `assets/design-system/`; Pages needs no parent workspace or build dependency. Run `node scripts/sync-portfolio-theme.mjs` to regenerate it from the vendored source. The homepage and all 17 permanent credential pages share the theme. `DESIGN.md` records the implemented system.

The orbit reel uses `completedOn` from `data/credentials.json` for **Completed: Month Day, Year** labels. `completionDateSource` records issuer evidence: Credly's `issued_at_date`, Microsoft Learn's `awardedOn`, or Skilljar's Completion Date. Credly's date-only field avoids timezone shifts from its issue timestamp. Expiration metadata is preserved separately; completed records without an individual dated source display **Completed**.

Browser regression callbacks and instructions are in [`tests/README.md`](tests/README.md).

The secondary collection contains 17 Google Skills badges and 19 LinkedIn Learning course completion certificates. It stays outside the 17-record orbital reel. Native disclosures expose certificate dates, durations, course context, original PDFs, and official LinkedIn sources; the collection has its own search and machine-readable JSON. Decision Intelligence appears first with five favorite stars. Forecasting (4.5/5) and Vector Search and Embeddings (4/5) display Joey’s personal ratings separately from issuer facts.

The LinkedIn PDFs are unchanged copies from the shared content archive, verified against `sourceSha256` in `data/linkedin-learning.json`. The Google Drive folder is linked from the collection header. Some older courses use an official LinkedIn catalog or article as their primary context source; `sourceKind` records that distinction.

The portfolio theme preserves the existing orbital reel, primary credential data, completion dates, secondary collection, ratings, PDFs, and detail-page navigation. The original `app.js` and `styles.css` remain unchanged. Do not replace this checkout wholesale with output from the separate development repository without first reconciling its reel changes.
