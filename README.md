# Joey Wilkes — Certifications

[Open the certification gallery](https://joeywilkes12.github.io/certifications-site/)

This repository contains the generated public website only. Development source is maintained separately. GitHub Pages publishes the root of the main branch.

The orbit reel uses `completedOn` from `data/credentials.json` for **Completed: Month Day, Year** labels. `completionDateSource` records issuer evidence: Credly's `issued_at_date`, Microsoft Learn's `awardedOn`, or Skilljar's Completion Date. Credly's date-only field avoids timezone shifts from its issue timestamp. Expiration metadata is preserved separately; completed records without an individual dated source display **Completed**.

Browser regression callbacks and instructions are in [`tests/README.md`](tests/README.md).
