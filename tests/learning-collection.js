// Playwright CLI callback. Run at 1440px desktop and 390px iPhone/WebKit.
async (page) => {
  const origin = new URL(page.url()).origin;
  if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) {
    throw new Error('Run this regression check against localhost.');
  }
  const width = page.viewportSize().width;
  const output = `output/playwright/learning-collection/${width}`;
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const normalize = value => value.trim().replace(/\s+/g, ' ');
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
    const readJson = async path => {
      const result = await page.request.get(new URL(path, `${origin}/`).href);
      assert(result.ok(), `${path}: public JSON did not return a successful response`);
      return result.json();
    };
    const [credentialData, badgeData, linkedinData] = await Promise.all([
      readJson('/data/credentials.json'), readJson('/data/badges.json'), readJson('/data/linkedin-learning.json'),
    ]);
    const credentials = credentialData.credentials;
    const badges = badgeData.badges;
    const certificates = linkedinData.certificates;
    assert(credentials.length === 17 && new Set(credentials.map(item => item.id)).size === 17, 'Expected 17 unique reel credentials');
    assert(badges.length === 17 && new Set(badges.map(item => item.id)).size === 17, 'Expected 17 unique Google Skills badge IDs');
    assert(certificates.length === 19 && new Set(certificates.map(item => item.id)).size === 19, 'Expected 19 unique LinkedIn certificate IDs');

    const embeddedCredentialData = await page.locator('#credential-data').evaluate(node => JSON.parse(node.textContent));
    const embeddedBadgeData = await page.locator('#badge-data').evaluate(node => JSON.parse(node.textContent));
    const embeddedLinkedinData = await page.locator('#linkedin-data').evaluate(node => JSON.parse(node.textContent));
    assert(JSON.stringify(embeddedCredentialData.credentials.map(item => item.id)) === JSON.stringify(credentials.map(item => item.id)), 'Embedded reel order differs from public credentials JSON');
    assert(JSON.stringify(embeddedBadgeData.badges.map(item => item.id)) === JSON.stringify(badges.map(item => item.id)), 'Embedded Google badge order differs from public badges JSON');
    assert(JSON.stringify(embeddedLinkedinData.certificates.map(item => item.id)) === JSON.stringify(certificates.map(item => item.id)), 'Embedded LinkedIn certificate order differs from public LinkedIn JSON');
    assert(embeddedBadgeData.badges.find(item => item.id === 'introduction-to-vertex-forecasting-and-time-series-in-practice')?.personalRating === 4.5, 'Embedded public badge JSON lost the 4.5 personal rating');
    assert(embeddedBadgeData.badges.find(item => item.id === 'vector-search-and-embeddings')?.personalRating === 4, 'Embedded public badge JSON lost the 4 personal rating');

    const rowOrder = [
      'decision-intelligence',
      ...badges.map(item => item.id),
      ...certificates.filter(item => item.id !== 'decision-intelligence').map(item => item.id),
    ];
    const collectionRows = page.locator('#badge-list > .badge-row');
    assert(await collectionRows.count() === 36, 'The combined learning collection must prerender 36 rows');
    const renderedRowOrder = await collectionRows.evaluateAll(rows => rows.map(row => row.dataset.certificateId || row.dataset.badgeId));
    assert(JSON.stringify(renderedRowOrder) === JSON.stringify(rowOrder), 'Combined collection changed its pinned Decision Intelligence, badge, or certificate order');
    assert(await page.locator('.badge-row[data-badge-id]').count() === 17, 'Expected 17 Google Skills rows');
    assert(await page.locator('.learning-certificate-row[data-certificate-id]').count() === 19, 'Expected 19 LinkedIn Learning rows');
    assert(await page.locator('.badge-entry:not([open])').count() === 36, 'All learning rows should start as closed disclosures');
    assert(await page.locator('.reel .badge-row').count() === 0, 'The secondary learning collection entered the reel');

    const openingCredential = credentials[0];
    const activeSlide = page.locator('.credential-slide.is-active');
    const openingId = await activeSlide.getAttribute('data-id');
    const openingPosition = normalize(await page.locator('#position').textContent());
    assert(openingId === openingCredential.id, 'The pinned reel opening credential changed');
    assert(openingPosition === `01 / ${credentials.length}`, 'The reel opening position changed');
    assert(await page.locator('.credential-slide').count() === 17, 'The reel no longer contains exactly 17 credentials');
    const assertReelUnchanged = async label => {
      assert(await page.locator('.credential-slide.is-active').getAttribute('data-id') === openingId, `${label}: collection search changed the active reel slide`);
      assert(normalize(await page.locator('#position').textContent()) === openingPosition, `${label}: collection search changed the reel position`);
      assert(await page.locator('.credential-row:visible').count() === 17, `${label}: collection search filtered reel records`);
      assert(await collectionRows.evaluateAll(rows => rows.map(row => row.dataset.certificateId || row.dataset.badgeId).join('\n')) === rowOrder.join('\n'), `${label}: filtering changed the stored collection order`);
    };

    const decision = certificates.find(item => item.id === 'decision-intelligence');
    assert(decision?.title === 'Decision Intelligence' && decision.favorite === true, 'Decision Intelligence must remain the first personal favorite');
    const decisionRow = page.locator('.learning-certificate-row[data-certificate-id="decision-intelligence"]');
    assert(await page.locator('#badge-list > .badge-row').first().getAttribute('data-certificate-id') === 'decision-intelligence', 'Decision Intelligence no longer leads the collection');
    assert(await decisionRow.locator('.badge-title').textContent() === decision.title, 'Decision Intelligence title differs from public JSON');
    assert(normalize(await decisionRow.locator('.favorite-mark').textContent()) === 'Personal favorite', 'Decision Intelligence lost its Personal favorite label');
    assert(await decisionRow.locator('.favorite-stars').getAttribute('aria-hidden') === 'true', 'Favorite stars must remain decorative');
    assert(await decisionRow.locator('.favorite-stars svg').count() === 5, 'Decision Intelligence must keep its five favorite stars');
    assert(await decisionRow.locator('.favorite-stars svg').evaluateAll(nodes => nodes.every(node => node.closest('[aria-hidden="true"]'))), 'Every favorite star must be decorative');

    const expectedRatings = {
      'introduction-to-vertex-forecasting-and-time-series-in-practice': {
        title: 'Introduction to Vertex Forecasting and Time Series in Practice', score: 4.5, full: 4, half: 1, empty: 0,
      },
      'vector-search-and-embeddings': {
        title: 'Vector Search and Embeddings', score: 4, full: 4, half: 0, empty: 1,
      },
    };
    const actualRatings = Object.fromEntries(badges.filter(item => item.personalRating !== undefined).map(item => [item.id, item.personalRating]));
    assert(JSON.stringify(actualRatings) === JSON.stringify(Object.fromEntries(Object.entries(expectedRatings).map(([id, rating]) => [id, rating.score]))), 'Only the two requested courses should have personal ratings');
    const sharedStarPath = 'm10 1.9 2.45 4.96 5.47.79-3.96 3.86.94 5.45L10 14.39l-4.9 2.57.94-5.45-3.96-3.86 5.47-.79z';
    for (const [id, expected] of Object.entries(expectedRatings)) {
      const source = badges.find(item => item.id === id);
      assert(source?.profileTitle === expected.title && source.personalRating === expected.score, `${id}: personal score or profile title differs from public JSON`);
      const row = page.locator(`.badge-row[data-badge-id="${id}"]`);
      const rating = row.locator('.personal-rating-mark');
      assert(await row.locator('.badge-title').textContent() === expected.title, `${id}: rendered title differs from public JSON`);
      assert(await rating.count() === 1, `${id}: expected one personal rating marker`);
      assert(await rating.getAttribute('role') === 'img', `${id}: personal rating needs one accessible image role`);
      assert(await rating.getAttribute('aria-label') === `Personal rating: ${expected.score} out of 5 stars`, `${id}: accessible label needs the exact numeric score`);
      assert(normalize(await rating.locator('.personal-rating-label').textContent()) === `Personal rating · ${expected.score}/5`, `${id}: visible label needs the exact numeric score`);
      assert(await page.getByRole('img', { name: `Personal rating: ${expected.score} out of 5 stars`, exact: true }).count() === 1, `${id}: accessible personal rating label is not exposed`);
      const stars = rating.locator('.personal-rating-stars');
      assert(await stars.getAttribute('aria-hidden') === 'true', `${id}: star group must be decorative`);
      const icons = stars.locator('svg');
      assert(await icons.count() === 5, `${id}: expected five authored SVG star icons`);
      assert(await icons.evaluateAll(nodes => nodes.every(node => node.getAttribute('aria-hidden') === 'true' && node.getAttribute('focusable') === 'false')), `${id}: all star SVGs must be decorative and unfocusable`);
      assert(await stars.locator('.rating-star-full').count() === expected.full, `${id}: full-star count is wrong`);
      assert(await stars.locator('.rating-star-half').count() === expected.half, `${id}: half-star count is wrong`);
      assert(await stars.locator('.rating-star-empty').count() === expected.empty, `${id}: empty-star count is wrong`);
      const fullShape = await stars.locator('.rating-star-full path').first().getAttribute('d');
      const emptyShape = expected.empty ? await stars.locator('.rating-star-empty path').first().getAttribute('d') : null;
      if (expected.full) assert(fullShape === sharedStarPath, `${id}: full star SVG shape changed`);
      if (expected.empty) assert(emptyShape === sharedStarPath, `${id}: empty star SVG shape changed`);
      if (expected.half) {
        const half = stars.locator('.rating-star-half');
        const base = half.locator('.rating-star-half-base');
        const fill = half.locator('.rating-star-half-fill');
        const clipRect = half.locator('defs clipPath rect');
        assert(await base.getAttribute('d') === sharedStarPath && await fill.getAttribute('d') === sharedStarPath, `${id}: half star uses the same authored star shape`);
        assert(await clipRect.getAttribute('x') === '0' && await clipRect.getAttribute('width') === '10' && await clipRect.getAttribute('height') === '20', `${id}: half star must clip the left half of its 20×20 viewBox`);
        assert((await fill.getAttribute('clip-path'))?.includes('personal-rating-half-'), `${id}: half fill is missing its clip path`);
      }
    }
    assert(await page.locator('.personal-rating-mark').count() === 2, 'Personal rating markers appeared on other courses');
    assert(await decisionRow.locator('.personal-rating-mark').count() === 0, 'Decision Intelligence must keep its favorite mark separate from personal course ratings');

    const formatDate = iso => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
    for (const badge of badges) {
      const row = page.locator(`.badge-row[data-badge-id="${badge.id}"]`);
      assert(normalize(await row.locator('.badge-overview').textContent()) === badge.documentation.overview, `${badge.id}: rendered description differs from public JSON`);
      assert(await row.locator('time').getAttribute('datetime') === badge.earnedOn, `${badge.id}: earned date differs from public JSON`);
      assert(normalize(await row.locator('time').textContent()) === `Earned ${formatDate(badge.earnedOn)} ${badge.earnedTimeZone}`, `${badge.id}: visible earned date differs from public JSON`);
    }
    for (const certificate of certificates) {
      const row = page.locator(`.learning-certificate-row[data-certificate-id="${certificate.id}"]`);
      assert(await row.locator('.badge-title').textContent() === certificate.title, `${certificate.id}: rendered title differs from public JSON`);
      assert(normalize(await row.locator('.badge-overview > p').textContent()) === certificate.documentation.overview, `${certificate.id}: rendered description differs from public JSON`);
      assert(await row.locator('time').getAttribute('datetime') === certificate.earnedOn, `${certificate.id}: earned date differs from public JSON`);
      assert(normalize(await row.locator('time').textContent()) === `Earned ${formatDate(certificate.earnedOn)}`, `${certificate.id}: visible earned date differs from public JSON`);
      const facts = await row.locator('.certificate-facts div').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.querySelector('dt')?.textContent.trim(), node.querySelector('dd')?.textContent.trim()])));
      assert(facts.Recipient === certificate.recipient, `${certificate.id}: recipient differs from public JSON`);
      assert(facts['Certificate ID'] === certificate.certificateId, `${certificate.id}: certificate ID differs from public JSON`);
      const pdfPath = new URL(certificate.certificatePath, `${origin}/`).href;
      const pdf = await page.request.get(pdfPath);
      assert(pdf.ok(), `${certificate.id}: PDF request failed with ${pdf.status()}`);
      assert(/^(application\/pdf|application\/octet-stream)(?:;|$)/i.test(pdf.headers()['content-type'] || ''), `${certificate.id}: certificate response has an unexpected PDF content type`);
      const bytes = await pdf.body();
      assert(Array.from(bytes.subarray(0, 5), byte => String.fromCharCode(byte)).join('') === '%PDF-', `${certificate.id}: certificate has no PDF signature`);
    }
    const folderLink = page.locator('.badge-header-links a.badge-profile-link').filter({ hasText: 'LinkedIn Learning Certificates folder' });
    assert(await folderLink.count() === 1, 'LinkedIn Learning certificates folder link is missing');
    assert(await folderLink.getAttribute('href') === linkedinData.folderUrl, 'LinkedIn Learning folder link differs from public JSON');

    const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent)));
    const personSchemas = schemas.filter(schema => schema['@type'] === 'Person');
    const listSchema = schemas.find(schema => schema['@type'] === 'ItemList' && schema.name === 'Google Skills badges & LinkedIn Learning Certificates');
    assert(personSchemas.length === 1 && listSchema, 'Personal credentials and the learning collection need separate JSON-LD schemas');
    const personSchema = personSchemas[0];
    assert(Array.isArray(personSchema.hasCredential), 'Person schema is missing its credential list');
    assert(!personSchema.hasCredential.some(item => [...badges, ...certificates].some(course => course.profileTitle === item.name || course.title === item.name)), 'Learning courses entered the Person credential claims');
    assert(listSchema.numberOfItems === 36 && listSchema.itemListElement.length === 36, 'ItemList schema must contain all 36 badges and certificates');
    assert(listSchema.itemListElement[0].item.name === 'Decision Intelligence', 'JSON-LD collection order no longer pins Decision Intelligence first');
    const ratingProperties = listSchema.itemListElement.flatMap(entry => (entry.item.additionalProperty || []).filter(property => property.name === 'personalRating').map(property => ({ name: entry.item.name, value: property.value, unitText: property.unitText })));
    assert(ratingProperties.length === 2, 'JSON-LD should contain exactly two personal rating properties');
    assert(ratingProperties.some(item => item.name === expectedRatings['introduction-to-vertex-forecasting-and-time-series-in-practice'].title && item.value === 4.5 && typeof item.value === 'number' && item.unitText === 'out of 5'), '4.5 personal rating is missing or not numeric in JSON-LD');
    assert(ratingProperties.some(item => item.name === expectedRatings['vector-search-and-embeddings'].title && item.value === 4 && typeof item.value === 'number' && item.unitText === 'out of 5'), '4 personal rating is missing or not numeric in JSON-LD');
    assert(!JSON.stringify(schemas).includes('AggregateRating'), 'Personal scores must not be described as aggregate reviews');

    const section = page.locator('#google-badges');
    const search = page.getByRole('searchbox', { name: 'Search Google Skills badges and LinkedIn Learning Certificates', exact: true });
    assert(await search.count() === 1, 'Learning collection search needs its accessible name');
    await section.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/collection-light.png`, scale: 'css', animations: 'disabled' });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Light collection state has horizontal overflow');

    const decisionSummary = decisionRow.locator('summary');
    assert(await decisionRow.locator('details').getAttribute('open') === null, 'Decision Intelligence should start collapsed');
    await activate(decisionSummary);
    assert(await decisionRow.locator('details').getAttribute('open') !== null, 'Decision Intelligence disclosure did not open');
    assert(await decisionRow.locator('.badge-entry-content').isVisible(), 'Decision Intelligence content is hidden after opening');
    await page.screenshot({ path: `${output}/decision-intelligence-expanded.png`, scale: 'css', animations: 'disabled' });
    await activate(decisionSummary);
    assert(await decisionRow.locator('details').getAttribute('open') === null, 'Decision Intelligence disclosure did not close');

    for (const [id, expected] of Object.entries(expectedRatings)) {
      await search.fill(expected.title);
      const visibleRows = page.locator('#badge-list > .badge-row:visible');
      assert(await visibleRows.count() === 1, `${id}: exact title search should show one rated course`);
      assert(await visibleRows.first().getAttribute('data-badge-id') === id, `${id}: title search returned the wrong row`);
      const row = page.locator(`.badge-row[data-badge-id="${id}"]`);
      assert(await row.locator('.personal-rating-mark').getAttribute('aria-label') === `Personal rating: ${expected.score} out of 5 stars`, `${id}: exact title search hid its accessible rating`);
      await row.scrollIntoViewIfNeeded();
      const file = id === 'introduction-to-vertex-forecasting-and-time-series-in-practice' ? 'forecasting-rating-search.png' : 'vector-rating-search.png';
      await page.screenshot({ path: `${output}/${file}`, scale: 'css', animations: 'disabled' });
      await assertReelUnchanged(`${id} search`);
      await activate(row.locator('summary'));
      assert(await row.locator('details').getAttribute('open') !== null, `${id}: disclosure failed while search filtered the collection`);
      assert(normalize(await row.locator('.personal-rating-label').textContent()) === `Personal rating · ${expected.score}/5`, `${id}: rating label disappeared when disclosure opened`);
      await activate(row.locator('summary'));
      assert(await row.locator('details').getAttribute('open') === null, `${id}: disclosure failed to close after rating search`);
    }

    await search.fill('Decision Intelligence');
    assert(await page.locator('#badge-list > .badge-row:visible').count() === 1, 'Decision Intelligence title search should show one certificate');
    assert(await page.locator('#badge-list > .badge-row:visible').getAttribute('data-certificate-id') === 'decision-intelligence', 'Decision Intelligence title search returned the wrong row');
    await assertReelUnchanged('Decision Intelligence search');
    await search.fill('no-course-matches-this-query-84721');
    assert(await page.locator('.badge-empty').isVisible(), 'No-match search did not show the recovery message');
    assert(await page.locator('#badge-list > .badge-row:visible').count() === 0, 'No-match search left rows visible');
    await activate(page.getByRole('button', { name: 'Show all', exact: true }));
    assert(await search.inputValue() === '', 'Show all did not clear the learning search');
    assert(await page.locator('#badge-list > .badge-row:visible').count() === 36, 'Show all did not restore the full 36-row collection');
    assert(await page.locator('.badge-empty').isHidden(), 'Empty-state message remained after clearing search');
    await assertReelUnchanged('Cleared search');

    await activate(page.locator('#theme-toggle'));
    assert(await page.locator('html').getAttribute('data-theme') === 'dark', 'Theme toggle did not switch to dark mode');
    await section.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/collection-dark.png`, scale: 'css', animations: 'disabled' });
    await search.fill(expectedRatings['introduction-to-vertex-forecasting-and-time-series-in-practice'].title);
    assert(await page.locator('#badge-list > .badge-row:visible').count() === 1, 'Dark mode broke exact course search');
    await page.screenshot({ path: `${output}/forecasting-rating-search-dark.png`, scale: 'css', animations: 'disabled' });
    await assertReelUnchanged('Dark mode rating search');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Dark collection state has horizontal overflow');
    await search.fill('');
    await activate(page.locator('#theme-toggle'));
    assert(await page.locator('html').getAttribute('data-theme') === 'light', 'Theme toggle did not return to light mode');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Final collection state has horizontal overflow');
    assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
    return { width, touch, combinedRowsChecked: 36, googleBadgesChecked: badges.length, linkedinCertificatesChecked: certificates.length, pdfsChecked: certificates.length, ratingsChecked: Object.keys(expectedRatings).length, structuredPersonalRatings: ratingProperties.length, consoleErrors: errors, output };
  } finally {
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
  }
}
