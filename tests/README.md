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
