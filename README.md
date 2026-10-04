# Joey Wilkes — Certifications

[Open the certification gallery](https://joeywilkes12.github.io/certifications-site/)

This repository contains the generated public website only. Development source is maintained separately. GitHub Pages publishes the root of the main branch.

The orbit reel uses `completedOn` from `data/credentials.json` for **Completed: Month Day, Year** labels. `completionDateSource` records issuer evidence: Credly's `issued_at_date`, Microsoft Learn's `awardedOn`, or Skilljar's Completion Date. Credly's date-only field avoids timezone shifts from its issue timestamp. Expiration metadata is preserved separately; completed records without an individual dated source display **Completed**.

Browser regression callbacks and instructions are in [`tests/README.md`](tests/README.md).

The secondary collection contains 17 Google Skills badges and 19 LinkedIn Learning course completion certificates. It stays outside the 17-record orbital reel. Native disclosures expose certificate dates, durations, course context, original PDFs, and official LinkedIn sources; the collection has its own search and machine-readable JSON. Decision Intelligence appears first with five favorite stars. Forecasting (4.5/5) and Vector Search and Embeddings (4/5) display Joey’s personal ratings separately from issuer facts.

The LinkedIn PDFs are unchanged copies from the shared content archive, verified against `sourceSha256` in `data/linkedin-learning.json`. The Google Drive folder is linked from the collection header. Some older courses use an official LinkedIn catalog or article as their primary context source; `sourceKind` records that distinction.

This branch integrates the secondary collection into the current public site while preserving its orbital reel, primary credential data, completion dates, and existing detail pages. Do not replace this checkout wholesale with output from the separate development repository without first reconciling those reel changes.
