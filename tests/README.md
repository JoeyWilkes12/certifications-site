# Reel regression checks

These files are Playwright CLI callbacks. Open the running localhost site,
take a fresh snapshot, then pass a callback's contents to `playwright-cli run-code`.
Run it once at 1440px in Chromium and once at 390px with the complete iPhone 15
WebKit device profile.

`reel-artwork.js` exercises 14 badges, the artwork links for nine affected credentials,
reduced motion, halo layering, image loading, and horizontal overflow. It also
verifies that collection thumbnails and credential subpages keep their original
image treatment. Screenshots go to `output/playwright/reel-artwork/<width>/`.

`reel-completion-dates.js` checks all 17 reel tiles and their pre-rendered HTML.
It verifies ten exact issuer-backed completion dates, the undated completed
record, and unchanged in-progress/to-do labels. It also checks the `<time>` ISO
dates, absence of expiration labels on the reel, matching embedded and public
JSON data, reduced motion, image loading, horizontal overflow, and console
errors. Full viewport, tile, and reel screenshots go to
`output/playwright/reel-completion-dates/<width>/`.

Example after starting a local server on port 4380:

```bash
playwright-cli --session=reel-artwork open http://127.0.0.1:4380/ --browser=chrome
playwright-cli --session=reel-artwork resize 1440 900
playwright-cli --session=reel-artwork snapshot
python3 - tests/reel-artwork.js <<'PY'
from pathlib import Path
import subprocess
import sys

subprocess.run(
    ['playwright-cli', '--session=reel-artwork', 'run-code', Path(sys.argv[1]).read_text()],
    check=True,
)
PY
playwright-cli --session=reel-artwork close
```

Use a writable QA directory as the CLI working directory when you want to keep
generated screenshots and session files outside this generated-site repository.
Pass the callback's absolute path when running from that QA directory. The bundled
`~/.codex/skills/playwright/scripts/playwright_cli.sh` wrapper can replace
`playwright-cli` in each command and in the Python argument list.

For mobile, open a separate session with `--browser=webkit --device='iPhone 15'`,
then run `resize 390 844` before the snapshot and callback. Resizing retains the
device's touchscreen, mobile user agent, and pixel ratio. Run each callback in
both device profiles, then close only its own browser session; keep the preview
server running for review.

`learning-collection.js` checks all 36 secondary entries (17 Google badges and
19 LinkedIn certificates), Decision Intelligence's first position and favorite
stars, the exact 4.5/5 Forecasting and 4/5 Vector Search ratings, accessible
labels, half-star geometry, matching public JSON, original PDF responses,
independent search, disclosures, empty recovery, themes, and reel isolation.
Use the same desktop and iPhone sessions described above. Its screenshots are
written under `output/playwright/learning-collection/<width>/`.

`node tests/static-content.mjs` verifies all 19 original PDF SHA-256 hashes,
prerendered record counts, exact ratings, embedded/public JSON parity, and
separate structured metadata without a browser.

Run strict hyperlink verification against the localhost server before release:

```bash
BASE_URL=http://127.0.0.1:4390 node tests/check-links.mjs --http-only
```

The checker follows HTTP redirects, fails on any 4xx/5xx response, checks expected
page content, and extracts PDF text with Poppler or Python's `pypdf` (set
`PDF_PYTHON` to the interpreter if needed). It uses no external browser
automation. `--internal-only` checks local destinations; `--match=<URL fragment>`
retries a specific failed target and writes a separate targeted report. Generated
reports and screenshots remain in the ignored `output/playwright/` directory.

The baseline FinOps for AI course source at
`https://learn.finops.org/path/certified-finops-for-ai` returns HTTP 403 to the
HTTP checker. It remains a reported failure, with no exception or pass override.
