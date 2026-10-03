// Run with playwright-cli run-code after opening the local site and taking a snapshot.
// Use a 1440px desktop session and a 390px iPhone/WebKit session.
async (page) => {
  const origin = new URL(page.url()).origin;
  if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) {
    throw new Error('Run this regression check against localhost.');
  }
  const width = page.viewportSize().width;
  const output = `output/playwright/reel-artwork/${width}`;
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const settled = id => page.waitForFunction(id => {
    const slide = document.querySelector('.credential-slide.is-active.is-front');
    return slide?.dataset.id === id && slide.style.display === 'block'
      && /translate3d\(-?0(?:\.0+)?px,\s*-?0(?:\.0+)?px,\s*-?0(?:\.0+)?px\)/.test(slide.style.transform);
  }, id);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(origin);
  const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  const activate = locator => touch ? locator.tap() : locator.click();
  const records = await page.locator('#credential-data').evaluate(node => JSON.parse(node.textContent).credentials);
  const ids = [
    'ai-value-introduction', 'ai-value-l1', 'ai-value-l2', 'ai-value-l3', 'ai-value-final',
    'finops-practitioner', 'focus-intro', 'focus-analyst', 'anthropic-skills',
    'ai-value', 'google-ml', 'greenops-ai', 'azure-fundamentals', 'aws-ai',
  ];
  const roundCrops = ids.slice(0, 7);
  for (const id of ids) {
    const record = records.find(item => item.id === id);
    await activate(page.getByRole('button', { name: `Show ${record.title}`, exact: true }));
    const slide = page.locator(`.credential-slide[data-id="${id}"]`);
    await settled(id);
    await slide.locator('.art-image img').evaluate(img => img.decode());
    const geometry = await slide.locator('.art-link').evaluate(link => {
      const frame = link.querySelector('.art-image');
      const img = frame.querySelector('img');
      const halo = link.querySelector('.art-halo');
      const style = getComputedStyle(frame);
      return {
        width: frame.offsetWidth, height: frame.offsetHeight,
        radius: style.borderRadius, overflow: style.overflow, clip: style.clipPath,
        imageLoaded: img.complete && img.naturalWidth > 0,
        haloAbove: +getComputedStyle(halo).zIndex > +style.zIndex,
        haloInteractive: getComputedStyle(halo).pointerEvents,
        haloAnimation: getComputedStyle(halo).animationName,
        href: link.getAttribute('href'), src: img.getAttribute('src'),
      };
    });
    assert(geometry.width === geometry.height, `${id}: artwork frame is not square`);
    assert(geometry.imageLoaded, `${id}: image did not load`);
    assert(geometry.haloAbove && geometry.haloInteractive === 'none', `${id}: halo hides artwork or intercepts clicks`);
    assert(geometry.haloAnimation === 'none', `${id}: reduced motion still animates the halo`);
    assert(geometry.href === record.detailPath && geometry.src === record.image, `${id}: source artwork or detail destination changed`);
    if (roundCrops.includes(id)) assert(geometry.radius === '50%' && geometry.overflow === 'hidden', `${id}: banner corners are not cropped`);
    if (id === 'anthropic-skills') assert(geometry.clip.startsWith('inset('), 'Agent skills certificate is not cropped');
    await slide.locator('.slide-art').screenshot({ path: `${output}/${id}.png`, animations: 'disabled' });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id}: horizontal overflow`);
  }
  const collectionIntact = await page.locator('.credential-row img').evaluateAll(images => images.every(img => {
    const style = getComputedStyle(img);
    return style.clipPath === 'none' && style.transform === 'none' && style.objectFit === 'contain';
  }));
  assert(collectionIntact, 'Reel crop leaked into the collection thumbnails');

  // Exercise the artwork link itself and verify every cropped credential's original image.
  for (const id of ids.slice(0, 9)) {
    const record = records.find(item => item.id === id);
    await activate(page.getByRole('button', { name: `Show ${record.title}`, exact: true }));
    await settled(id);
    await activate(page.locator(`.credential-slide[data-id="${id}"] .art-link`));
    await page.waitForURL(new URL(record.detailPath, origin + '/').href);
    const detail = await page.locator('.detail-artwork img').evaluate(img => {
      const style = getComputedStyle(img);
      return { loaded: img.complete && img.naturalWidth > 0, src: new URL(img.src).pathname, clip: style.clipPath, transform: style.transform, radius: style.borderRadius, fit: style.objectFit };
    });
    assert(detail.loaded && detail.src.endsWith('/' + record.image), `${id}: original detail artwork missing`);
    assert(detail.clip === 'none' && detail.transform === 'none' && detail.radius === '0px' && detail.fit === 'contain', `${id}: reel crop leaked into the subpage`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${id}: detail page overflow`);
    if (['anthropic-skills', 'ai-value-l1', 'finops-practitioner'].includes(id)) {
      await page.locator('.detail-hero').screenshot({ path: `${output}/${id}-detail.png`, animations: 'disabled' });
    }
    await page.goto(origin);
  }

  // Capture the live pulse, including its outer ring, above a formerly opaque image.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await activate(page.getByRole('button', { name: 'Show FinOps Certified Practitioner', exact: true }));
  await settled('finops-practitioner');
  const halo = page.locator('.credential-slide.is-active.is-front .art-halo');
  assert(await halo.evaluate(node => getComputedStyle(node).animationName === 'halo-pulse'), 'Normal motion lost the pulse');
  await halo.evaluate(node => {
    for (const animation of node.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = 1200; }
  });
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  await page.waitForFunction(() => scrollY === 0);
  await page.screenshot({ path: `${output}/reel-pulse.png`, scale: 'css' });
  assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  return { width, touch, reelBadgesChecked: ids.length, detailLinksChecked: 9, consoleErrors: errors, output };
}
