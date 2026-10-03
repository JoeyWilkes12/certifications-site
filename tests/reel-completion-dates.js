// Playwright CLI callback. Run against localhost at 1440px desktop and 390px iPhone/WebKit.
async (page) => {
  const origin = new URL(page.url()).origin;
  if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) {
    throw new Error('Run this regression check against localhost.');
  }
  const width = page.viewportSize().width;
  const output = `output/playwright/reel-completion-dates/${width}`;
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const knownDates = {
    'google-ml': '2024-12-31',
    'aws-ai': '2026-01-30',
    'finops-engineer': '2024-06-13',
    'focus-analyst': '2025-02-05',
    'azure-fundamentals': '2023-11-29',
    'greenops': '2026-05-28',
    'anthropic-skills': '2026-07-08',
    'focus-intro': '2024-08-19',
    'finops-practitioner': '2022-11-05',
    'finops-containers': '2023-10-18',
  };
  const knownStatuses = {
    'ai-value': 'in-progress',
    'ai-value-l1': 'in-progress',
    'greenops-ai': 'in-progress',
    'ai-value-l2': 'to-do',
    'ai-value-l3': 'to-do',
    'ai-value-final': 'to-do',
  };
  const formatDate = iso => new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
  const canonical = value => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
      : value;
  const sameData = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
  const settled = id => page.waitForFunction(id => {
    const slide = document.querySelector('.credential-slide.is-active.is-front');
    return slide?.dataset.id === id && slide.style.display === 'block'
      && /translate3d\(-?0(?:\.0+)?px,\s*-?0(?:\.0+)?px,\s*-?0(?:\.0+)?px\)/.test(slide.style.transform);
  }, id);
  const errors = [];
  const onPageError = error => errors.push(error.message);
  const onConsole = message => { if (message.type() === 'error') errors.push(message.text()); };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);

  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const response = await page.goto(origin);
    assert(response?.ok(), 'Local gallery did not return a successful response');
    const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    const activate = locator => touch ? locator.tap() : locator.click();
    const embedded = await page.locator('#credential-data').evaluate(node => JSON.parse(node.textContent));
    const publicResponse = await page.request.get(new URL('/data/credentials.json', origin).href);
    assert(publicResponse.ok(), 'Machine-readable credential data did not return a successful response');
    const publicData = await publicResponse.json();
    assert(sameData(embedded, publicData), 'Embedded credential data differs from data/credentials.json');
    const records = publicData.credentials;
    assert(records.length === 17 && new Set(records.map(record => record.id)).size === 17, 'Expected 17 unique credential records');
    const expectedIds = [...Object.keys(knownDates), ...Object.keys(knownStatuses), 'ai-value-introduction'];
    assert(sameData(records.map(record => record.id).sort(), expectedIds.sort()), 'The credential set differs from the 17 expected records');
    assert(await page.locator('.credential-slide').count() === 17, 'The reel does not contain all 17 records');

    const expectedLabel = record => {
      const iso = knownDates[record.id];
      if (iso) {
        assert(record.progressStatus === 'completed' && record.completedOn === iso, `${record.id}: verified completion date changed`);
        return `Completed: ${formatDate(iso)}`;
      }
      if (record.id === 'ai-value-introduction') {
        assert(record.progressStatus === 'completed' && !record.completedOn, 'AI Value Introduction gained an unsupported completion date');
        return 'Completed';
      }
      assert(!record.completedOn, `${record.id}: incomplete learning record gained a completion date`);
      assert(record.progressStatus === knownStatuses[record.id], `${record.id}: in-progress/to-do status changed`);
      const label = { 'in-progress': 'In Progress', 'to-do': 'To Do' }[record.progressStatus];
      assert(label, `${record.id}: unexpected learning status`);
      return label;
    };
    const checkMetadata = (record, metadata, location) => {
      assert(metadata.text === expectedLabel(record), `${location} ${record.id}: expected "${expectedLabel(record)}", found "${metadata.text}"`);
      const expectedDate = knownDates[record.id];
      assert(metadata.times.length === (expectedDate ? 1 : 0), `${location} ${record.id}: incorrect completion time count`);
      if (expectedDate) assert(metadata.times[0].datetime === expectedDate && metadata.times[0].text === expectedLabel(record), `${location} ${record.id}: completion time has incorrect ISO date or text`);
      assert(!/\b(?:expires?|expired|expiration)\b/i.test(metadata.text), `${location} ${record.id}: expiration label remains on the reel`);
    };

    // Parse the HTTP response as inert HTML so the labels are verified before any JavaScript runs.
    const htmlResponse = await page.request.get(origin);
    assert(htmlResponse.ok(), 'Pre-rendered gallery did not return a successful response');
    const prerendered = await page.evaluate(html => {
      const document = new DOMParser().parseFromString(html, 'text/html');
      const normalize = text => text.trim().replace(/\s+/g, ' ');
      return {
        data: JSON.parse(document.querySelector('#credential-data').textContent),
        slides: [...document.querySelectorAll('.credential-slide')].map(slide => {
          const metadata = slide.querySelector('.credential-metadata');
          return {
            id: slide.dataset.id,
            text: normalize(metadata.textContent),
            times: [...metadata.querySelectorAll('time')].map(time => ({ datetime: time.getAttribute('datetime'), text: normalize(time.textContent) })),
          };
        }),
      };
    }, await htmlResponse.text());
    assert(sameData(prerendered.data, publicData), 'Pre-rendered credential data differs from data/credentials.json');
    assert(prerendered.slides.length === 17, 'Pre-rendered HTML does not contain all 17 reel tiles');
    for (const record of records) {
      const metadata = prerendered.slides.find(slide => slide.id === record.id);
      assert(metadata, `Pre-rendered ${record.id}: missing reel tile`);
      checkMetadata(record, metadata, 'Pre-rendered');
    }

    const viewportCaptures = new Set(['google-ml', 'azure-fundamentals', 'finops-containers']);
    for (const record of records) {
      await activate(page.getByRole('button', { name: `Show ${record.title}`, exact: true }));
      await settled(record.id);
      const slide = page.locator(`.credential-slide[data-id="${record.id}"]`);
      await slide.locator('.art-image img').evaluate(img => img.decode());
      const metadata = await slide.locator('.credential-metadata').evaluate(node => {
        const normalize = text => text.trim().replace(/\s+/g, ' ');
        return {
          text: normalize(node.textContent),
          times: [...node.querySelectorAll('time')].map(time => ({ datetime: time.getAttribute('datetime'), text: normalize(time.textContent) })),
        };
      });
      checkMetadata(record, metadata, 'Live reel');
      assert(await slide.locator('.art-halo').evaluate(node => getComputedStyle(node).animationName === 'none'), `${record.id}: reduced motion still animates the halo`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${record.id}: horizontal overflow`);
      if (viewportCaptures.has(record.id)) {
        await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
        await page.waitForFunction(() => scrollY === 0);
        await page.screenshot({ path: `${output}/${record.id}-viewport.png`, scale: 'css', animations: 'disabled' });
        await slide.screenshot({ path: `${output}/${record.id}-tile.png`, scale: 'css', animations: 'disabled' });
        await page.locator('#slide-stack').screenshot({ path: `${output}/${record.id}-reel.png`, scale: 'css', animations: 'disabled' });
      }
      if (record.id === 'ai-value-l1') {
        await slide.screenshot({ path: `${output}/ai-value-l1-tile.png`, scale: 'css', animations: 'disabled' });
      }
    }
    assert(!/\b(?:expires?|expired|expiration)\b/i.test(await page.locator('#slide-stack').textContent()), 'An expiration label remains in the reel');
    assert(await page.locator('#auto-status').textContent() === 'Paused', 'Reduced motion did not pause automatic rotation');
    const before = await page.locator('#position').textContent();
    await page.waitForTimeout(4700);
    assert(await page.locator('#position').textContent() === before, 'Reduced motion allowed automatic rotation');
    assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
    return { width, touch, reelTilesChecked: records.length, datedCompletionsChecked: Object.keys(knownDates).length, prerenderedTilesChecked: prerendered.slides.length, embeddedDataMatches: true, consoleErrors: errors, output };
  } finally {
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
  }
}
