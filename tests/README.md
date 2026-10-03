# Reel artwork regression

`reel-artwork.js` is a Playwright CLI callback. Open the running localhost site,
take a fresh snapshot, then pass this file's contents to `playwright-cli run-code`.
Run it once at 1440px in Chromium and once at 390px with the complete iPhone 15
WebKit device profile.

The check exercises 14 badges, the artwork links for nine affected credentials,
reduced motion, halo layering, image loading, and horizontal overflow. It also
verifies that collection thumbnails and credential subpages keep their original
image treatment. Screenshots go to `output/playwright/reel-artwork/<width>/`.

Example after starting a local server on port 4380:

```bash
playwright-cli --session=reel-artwork open http://127.0.0.1:4380/ --browser=chrome
playwright-cli --session=reel-artwork resize 1440 900
playwright-cli --session=reel-artwork snapshot
playwright-cli --session=reel-artwork run-code "$(cat tests/reel-artwork.js)"
playwright-cli --session=reel-artwork close
```

Use a writable QA directory as the CLI working directory when you want to keep
generated screenshots and session files outside this generated-site repository.
