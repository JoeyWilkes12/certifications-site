// Playwright CLI callback for localhost, at 1440px desktop and 390px iPhone/WebKit.
// Separate contexts preserve the caller's browser and stored appearance.
async (page) => {
  const origin = new URL(page.url()).origin;
  if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) {
    throw new Error('Run this theme resilience check against localhost.');
  }
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const width = page.viewportSize().width;
  const output = `output/playwright/theme-resilience/${width}`;
  const browser = page.context().browser();
  const device = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    deviceScaleFactor: devicePixelRatio,
    hasTouch: navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches,
    isMobile: /iPhone|iPad|Android.*Mobile|Mobile/.test(navigator.userAgent),
  }));
  const contextOptions = { ...device, viewport: page.viewportSize(), reducedMotion: 'reduce' };
  const palettes = {
    light: { background: 'rgb(245, 240, 231)', color: 'rgb(4, 16, 31)', metadata: '#f5f0e7' },
    dark: { background: 'rgb(4, 16, 31)', color: 'rgb(245, 240, 231)', metadata: '#04101f' },
  };
  const errors = [];
  const contexts = [];
  const staticChecks = [];
  const readableResults = [];
  const activate = (target, locator) => device.hasTouch ? locator.tap() : locator.click();
  const watch = (target, label) => {
    target.on('pageerror', error => errors.push(`${label}: ${error.message}`));
    target.on('console', message => { if (message.type() === 'error') errors.push(`${label}: ${message.text()}`); });
  };
  const noOverflow = async (target, label) => assert(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: horizontal overflow`);
  const palette = async (target, theme, label, scripted = false) => {
    const actual = await target.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      color: getComputedStyle(document.body).color,
      theme: document.documentElement.dataset.theme || null,
      enabled: document.body.classList.contains('js-enabled'),
      metadata: document.querySelector('meta[name="theme-color"]').content,
      pressed: document.querySelector('#theme-toggle').getAttribute('aria-pressed'),
      buttonLabel: document.querySelector('#theme-toggle').getAttribute('aria-label'),
    }));
    assert(actual.background === palettes[theme].background && actual.color === palettes[theme].color, `${label}: body does not resolve the portfolio ${theme} palette`);
    assert(actual.enabled === scripted, `${label}: JavaScript-enabled state is incorrect`);
    if (scripted) {
      assert(actual.theme === theme && actual.metadata === palettes[theme].metadata, `${label}: explicit theme or browser theme-color did not update`);
      assert(actual.pressed === String(theme === 'dark') && actual.buttonLabel === `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`, `${label}: theme button does not expose the selected appearance`);
    } else assert(actual.theme === null, `${label}: script-disabled HTML gained an explicit theme`);
    await noOverflow(target, label);
    return actual;
  };
  // Check actual static text on the painted backgrounds, including translucent
  // panels. Every row is inspected, not only the first visible viewport.
  const readable = async (target, label, selectors) => {
    const results = await target.evaluate(selectors => {
      const rgba = value => {
        if (value === 'transparent') return [0, 0, 0, 0];
        const match = value.match(/^rgba?\((.*)\)$/);
        const alpha = part => part === undefined ? 1 : part.endsWith('%') ? parseFloat(part) / 100 : +part;
        if (match) {
          const parts = match[1].replace(/\//g, ' ').split(/[,\s]+/).filter(Boolean);
          const channel = part => part.endsWith('%') ? parseFloat(part) * 2.55 : +part;
          return [channel(parts[0]), channel(parts[1]), channel(parts[2]), alpha(parts[3])];
        }
        const srgb = value.match(/^color\(srgb\s+(.+)\)$/);
        if (srgb) {
          const parts = srgb[1].replace(/\//g, ' ').split(/\s+/).filter(Boolean);
          const channel = part => (part.endsWith('%') ? parseFloat(part) / 100 : +part) * 255;
          return [channel(parts[0]), channel(parts[1]), channel(parts[2]), alpha(parts[3])];
        }
        throw new Error(`Unsupported computed color: ${value}`);
      };
      const composite = (front, back) => [...front.slice(0, 3).map((channel, i) => channel * front[3] + back[i] * (1 - front[3])), 1];
      const background = node => {
        const ancestors = [];
        for (let parent = node; parent; parent = parent.parentElement) ancestors.unshift(parent);
        return ancestors.reduce((paint, ancestor) => {
          const style = getComputedStyle(ancestor);
          if (style.backgroundImage !== 'none') throw new Error(`Static contrast probe needs a sampled background image: ${ancestor.className || ancestor.tagName}`);
          return composite(rgba(style.backgroundColor), paint);
        }, [255, 255, 255, 1]);
      };
      const luminance = color => color.slice(0, 3).reduce((sum, channel, i) => {
        const value = channel / 255;
        return sum + (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i];
      }, 0);
      return selectors.flatMap(selector => [...document.querySelectorAll(selector)].map(node => {
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const back = background(node);
        const fore = rgba(style.color);
        fore[3] *= Number(style.opacity);
        const painted = composite(fore, back);
        const first = luminance(painted), second = luminance(back);
        return { selector, text: node.textContent.trim().replace(/\s+/g, ' '),
          visible: Boolean(box.width && box.height && style.visibility !== 'hidden' && style.display !== 'none'),
          contrast: +((Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)).toFixed(3) };
      }));
    }, selectors);
    assert(results.length > 0, `${label}: static readability probe found no text`);
    for (const result of results) {
      assert(result.visible && result.text, `${label}: static text is empty or hidden (${result.selector})`);
      assert(result.contrast >= 4.5, `${label}: ${result.text} has ${result.contrast}:1 contrast; expected 4.5:1`);
    }
    readableResults.push({ label, textNodesChecked: results.length, minimumContrast: Math.min(...results.map(result => result.contrast)) });
  };

  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ ...contextOptions, javaScriptEnabled: false, colorScheme: theme });
      contexts.push(context);
      const target = await context.newPage();
      watch(target, `${theme} without JavaScript`);
      assert((await target.goto(origin))?.ok(), `${theme}: static gallery did not return a successful response`);
      await palette(target, theme, `${theme} static gallery`);
      const credentialRows = target.locator('.credential-row');
      const learningRows = target.locator('#badge-list > .badge-row');
      assert(await credentialRows.count() === 17 && await target.locator('.credential-row:visible').count() === 17, `${theme}: static credential collection must expose all 17 records`);
      assert(await learningRows.count() === 36 && await target.locator('#badge-list > .badge-row:visible').count() === 36, `${theme}: static learning collection must expose all 36 records`);
      await readable(target, `${theme} static records`, ['.credential-row .row-main h3', '.credential-row .row-main p', '.credential-row .record-status', '#badge-list .badge-title', '#badge-list .badge-metadata']);
      for (const selector of ['#theme-toggle', '#previous', '#next', '#search', '#status-filter', '#badge-search']) {
        assert(await target.locator(selector).isHidden(), `${theme}: script-dependent control ${selector} remains visible without JavaScript`);
      }
      await target.screenshot({ path: `${output}/${theme}-nojs-hero.png`, scale: 'css', animations: 'disabled' });
      await target.locator('#collection').scrollIntoViewIfNeeded();
      await target.screenshot({ path: `${output}/${theme}-nojs-credentials.png`, scale: 'css', animations: 'disabled' });
      await target.locator('#google-badges').scrollIntoViewIfNeeded();
      await target.screenshot({ path: `${output}/${theme}-nojs-learning.png`, scale: 'css', animations: 'disabled' });

      const decision = target.locator('.learning-certificate-row[data-certificate-id="decision-intelligence"]');
      assert(await decision.locator('details').getAttribute('open') === null, `${theme}: native disclosure did not start collapsed`);
      await activate(target, decision.locator('summary'));
      assert(await decision.locator('details').getAttribute('open') !== null && await decision.locator('.badge-entry-content').isVisible(), `${theme}: native Decision Intelligence disclosure did not open without JavaScript`);
      const pdf = decision.locator('.badge-actions a').filter({ hasText: 'Certificate PDF' });
      assert(await pdf.getAttribute('href') === 'assets/linkedin-learning/decision-intelligence.pdf', `${theme}: native disclosure lost the original PDF destination`);
      assert(await pdf.isVisible(), `${theme}: original PDF link is hidden inside the native disclosure`);
      const response = await target.request.get(new URL(await pdf.getAttribute('href'), `${origin}/`).href);
      assert(response.ok(), `${theme}: original PDF did not return a successful response`);
      const bytes = await response.body();
      assert(Array.from(bytes.subarray(0, 5), byte => String.fromCharCode(byte)).join('') === '%PDF-', `${theme}: original certificate has no PDF signature`);
      await readable(target, `${theme} native disclosure`, ['.learning-certificate-row[data-certificate-id="decision-intelligence"] .badge-overview > p', '.learning-certificate-row[data-certificate-id="decision-intelligence"] .badge-actions a']);
      await target.screenshot({ path: `${output}/${theme}-nojs-linkedin-expanded.png`, scale: 'css', animations: 'disabled' });
      await noOverflow(target, `${theme} native disclosure`);

      await activate(target, target.locator('.credential-row[data-id="google-ml"] .row-detail-link'));
      await target.waitForURL(new URL('/credentials/google-ml/', origin).href);
      await palette(target, theme, `${theme} static credential detail`);
      assert(await target.locator('#theme-toggle').isHidden(), `${theme}: static detail exposes a script-dependent theme control`);
      const artwork = target.locator('.detail-artwork img');
      await artwork.evaluate(img => img.decode());
      const original = await artwork.evaluate(img => ({ loaded: img.complete && img.naturalWidth > 0, path: new URL(img.src).pathname,
        fit: getComputedStyle(img).objectFit, clip: getComputedStyle(img).clipPath, transform: getComputedStyle(img).transform }));
      assert(original.loaded && original.path === '/assets/artwork/google-machine-learning.png' && original.fit === 'contain' && original.clip === 'none' && original.transform === 'none', `${theme}: static detail changed the original credential artwork`);
      await readable(target, `${theme} static detail`, ['.detail-issuer', '.detail-kind', '.detail-metadata .record-status', '.detail-overview', '.detail-back']);
      const back = target.locator('.detail-back');
      assert(await back.getAttribute('href') === '../../#credential-google-ml' && await back.isVisible(), `${theme}: static return link lost its collection destination`);
      await target.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await target.screenshot({ path: `${output}/${theme}-nojs-detail.png`, scale: 'css', animations: 'disabled' });
      await activate(target, back);
      await target.waitForURL(url => url.origin === origin && url.pathname === '/' && url.hash === '#credential-google-ml');
      await palette(target, theme, `${theme} static return to collection`);
      staticChecks.push({ theme, credentialRows: 17, learningRows: 36, nativeDisclosure: true, originalPDF: true, originalArtwork: true, detailReturn: true });
      await context.close();
    }

    const denied = await browser.newContext({ ...contextOptions, colorScheme: 'dark' });
    contexts.push(denied);
    await denied.addInitScript(() => {
      window.__themeStorageDenied = { get: 0, set: 0 };
      Object.defineProperty(Storage.prototype, 'getItem', { configurable: true, value() {
        window.__themeStorageDenied.get += 1;
        throw new DOMException('Storage disabled for resilience verification', 'SecurityError');
      } });
      Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value() {
        window.__themeStorageDenied.set += 1;
        throw new DOMException('Storage disabled for resilience verification', 'SecurityError');
      } });
    });
    const target = await denied.newPage();
    watch(target, 'storage denied');
    assert((await target.goto(origin))?.ok(), 'Storage-denied gallery did not return a successful response');
    await palette(target, 'light', 'Storage-get denial falls back to light', true);
    assert(await target.evaluate(() => window.__themeStorageDenied.get) > 0, 'The initial appearance did not exercise denied storage reads');
    await target.screenshot({ path: `${output}/storage-denied-light-fallback.png`, scale: 'css', animations: 'disabled' });
    await activate(target, target.locator('#theme-toggle'));
    await palette(target, 'dark', 'Storage-set denial still permits dark selection', true);
    await target.screenshot({ path: `${output}/storage-denied-dark-selected.png`, scale: 'css', animations: 'disabled' });
    await activate(target, target.locator('#theme-toggle'));
    await palette(target, 'light', 'Storage-set denial still permits light selection', true);
    const attempts = await target.evaluate(() => ({ ...window.__themeStorageDenied }));
    assert(attempts.set >= 2, 'Theme selection did not exercise denied storage writes');
    await target.reload();
    await palette(target, 'light', 'Denied storage reload remains usable', true);
    await activate(target, target.locator('.credential-row[data-id="google-ml"] .row-detail-link'));
    await target.waitForURL(new URL('/credentials/google-ml/', origin).href);
    await palette(target, 'light', 'Denied storage detail remains usable', true);
    await activate(target, target.locator('#theme-toggle'));
    await palette(target, 'dark', 'Denied storage detail toggle responds', true);
    await target.locator('.detail-artwork img').evaluate(img => img.decode());
    await target.screenshot({ path: `${output}/storage-denied-detail-dark.png`, scale: 'css', animations: 'disabled' });
    assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
    return { width, device, staticChecks, readableResults, deniedStorage: { darkOSFallsBackLight: true, attempts,
      bothToggleDirections: true, reloadUsable: true, detailToggleUsable: true }, consoleErrors: errors, output };
  } finally {
    // Closing already-closed contexts is harmless and leaves the caller's page open.
    for (const context of contexts) await context.close().catch(() => {});
  }
}
