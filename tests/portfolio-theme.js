// Playwright CLI callback for localhost, at 1440px Chromium and 390px iPhone/WebKit.
// The existing artwork, completion-date, collection, and swipe callbacks remain
// the behavioral regressions; this callback verifies the portfolio theme skin.
async (page) => {
  const origin = new URL(page.url()).origin;
  if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) {
    throw new Error('Run this theme regression check against localhost.');
  }
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const width = page.viewportSize().width;
  const output = `output/playwright/portfolio-theme/${width}`;
  const errors = [];
  const onPageError = error => errors.push(error.message);
  const onConsole = message => { if (message.type() === 'error') errors.push(message.text()); };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  const contrastResults = [];
  const geometryResults = [];
  const persistence = [];
  const palettes = {
    light: { background: 'rgb(245, 240, 231)', color: 'rgb(4, 16, 31)', metadata: '#f5f0e7' },
    dark: { background: 'rgb(4, 16, 31)', color: 'rgb(245, 240, 231)', metadata: '#04101f' },
  };
  const normalizeFont = value => value.replaceAll('"', '').replaceAll("'", '').replace(/\s*,\s*/g, ',').trim();
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const noOverflow = async label => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: horizontal overflow`);
  const settled = id => page.waitForFunction(id => {
    const slide = document.querySelector('.credential-slide.is-active.is-front');
    return slide?.dataset.id === id && slide.style.display === 'block'
      && /translate3d\(-?0(?:\.0+)?px,\s*-?0(?:\.0+)?px,\s*-?0(?:\.0+)?px\)/.test(slide.style.transform);
  }, id);

  // Paint-order compositing handles translucent chip and ancestor backgrounds.
  // Unsupported image backgrounds fail instead of producing a misleading ratio.
  const measureContrast = targets => page.evaluate(targets => {
    const parse = value => {
      if (value === 'transparent') return [0, 0, 0, 0];
      const rgb = value.match(/^rgba?\((.*)\)$/);
      if (rgb) {
        const parts = rgb[1].replace(/\//g, ' ').split(/[,\s]+/).filter(Boolean);
        const channel = part => part.endsWith('%') ? parseFloat(part) * 2.55 : +part;
        return [channel(parts[0]), channel(parts[1]), channel(parts[2]), parts[3] === undefined ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : +parts[3]];
      }
      const srgb = value.match(/^color\(srgb\s+(.+)\)$/);
      if (srgb) {
        const parts = srgb[1].replace(/\//g, ' ').split(/\s+/).map(Number);
        return [parts[0] * 255, parts[1] * 255, parts[2] * 255, parts[3] ?? 1];
      }
      throw new Error(`Unsupported computed color: ${value}`);
    };
    const composite = (front, back) => {
      const alpha = front[3] + back[3] * (1 - front[3]);
      return [...front.slice(0, 3).map((channel, i) => alpha ? (channel * front[3] + back[i] * back[3] * (1 - front[3])) / alpha : 0), alpha];
    };
    const background = node => {
      const ancestors = [];
      for (let parent = node; parent; parent = parent.parentElement) ancestors.unshift(parent);
      let result = [255, 255, 255, 1];
      for (const ancestor of ancestors) {
        const style = getComputedStyle(ancestor);
        if (style.backgroundImage !== 'none') throw new Error(`Contrast probe needs a sampled background image for ${ancestor.className || ancestor.tagName}`);
        result = composite(parse(style.backgroundColor), result);
      }
      return result;
    };
    const luminance = color => color.slice(0, 3).reduce((sum, channel, i) => {
      const value = channel / 255;
      return sum + (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i];
    }, 0);
    const ratio = (a, b) => {
      const first = luminance(a), second = luminance(b);
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    };
    return targets.map(target => {
      const node = document.querySelector(target.selector);
      if (!node || !node.getClientRects().length) throw new Error(`Contrast target is missing or hidden: ${target.selector}`);
      const style = getComputedStyle(node, target.pseudo || null);
      let back = background(target.kind === 'focus' ? node.parentElement : node);
      if (target.pseudo && target.kind !== 'indicator') back = composite(parse(style.backgroundColor), back);
      const property = target.kind === 'focus' ? 'outlineColor' : target.kind === 'indicator' ? 'backgroundColor' : 'color';
      const foreground = parse(style[property]);
      foreground[3] *= Number(style.opacity);
      const painted = composite(foreground, back);
      const fontSize = parseFloat(style.fontSize);
      const fontWeight = parseInt(style.fontWeight, 10) || 400;
      const large = fontSize >= 24 || (fontSize >= 18.6667 && fontWeight >= 700);
      const minimum = target.kind === 'focus' || target.kind === 'indicator' ? 3 : large && target.heading ? 3 : 4.5;
      return { label: target.label, selector: target.selector, pseudo: target.pseudo, kind: target.kind || 'text',
        foreground: style[property], effectiveBackground: back.slice(0, 3).map(channel => +channel.toFixed(2)),
        ratio: +ratio(painted, back).toFixed(3), minimum, fontSize,
        focused: target.kind === 'focus' ? node.matches(':focus-visible') : undefined,
        outlineWidth: target.kind === 'focus' ? parseFloat(style.outlineWidth) : undefined,
        outlineStyle: target.kind === 'focus' ? style.outlineStyle : undefined };
    });
  }, targets);
  const checkContrast = async (theme, targets) => {
    const results = await measureContrast(targets);
    for (const result of results) {
      assert(result.ratio >= result.minimum, `${theme} ${result.label}: ${result.ratio}:1 contrast; expected ${result.minimum}:1 (${result.foreground} over ${result.effectiveBackground.join(',')})`);
      if (result.kind === 'focus') assert(result.focused && result.outlineWidth >= 2 && result.outlineStyle !== 'none', `${theme} ${result.label}: missing visible focus outline`);
      contrastResults.push({ theme, ...result });
    }
  };
  const reflectTheme = async (theme, label) => {
    await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
    const actual = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      color: getComputedStyle(document.body).color,
      bodyFont: getComputedStyle(document.body).fontFamily,
      displayFont: getComputedStyle(document.querySelector('h1')).fontFamily,
      metadata: document.querySelector('meta[name="theme-color"]').content,
      pressed: document.querySelector('#theme-toggle').getAttribute('aria-pressed'),
      label: document.querySelector('#theme-toggle').getAttribute('aria-label'),
      tokens: Object.fromEntries(['navy-950', 'paper', 'gold', 'pink', 'sans', 'display'].map(name => [name, getComputedStyle(document.documentElement).getPropertyValue(`--portfolio-${name}`).trim()])),
    }));
    assert(actual.background === palettes[theme].background && actual.color === palettes[theme].color, `${label}: body palette does not match the portfolio ${theme} theme`);
    assert(actual.metadata === palettes[theme].metadata, `${label}: theme-color differs from the body surface`);
    assert(actual.pressed === String(theme === 'dark') && actual.label === `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`, `${label}: theme control does not expose the selected appearance`);
    assert(actual.tokens['navy-950'] === '#04101f' && actual.tokens.paper === '#f5f0e7' && actual.tokens.gold === '#d9ad59' && actual.tokens.pink === '#ff5c91', `${label}: portfolio primitive tokens changed`);
    assert(normalizeFont(actual.bodyFont) === 'Avenir Next,Helvetica Neue,Segoe UI,sans-serif', `${label}: body does not render with the portfolio font stack (${actual.bodyFont})`);
    assert(normalizeFont(actual.displayFont) === 'Iowan Old Style,Baskerville,Times New Roman,serif', `${label}: heading does not render with the portfolio display stack (${actual.displayFont})`);
    assert(normalizeFont(actual.tokens.sans) === normalizeFont(actual.bodyFont) && normalizeFont(actual.tokens.display) === normalizeFont(actual.displayFont), `${label}: rendered fonts diverge from shared tokens`);
    await noOverflow(label);
    return actual;
  };

  try {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
    assert((await page.goto(origin))?.ok(), 'Local gallery did not return a successful response');
    const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    const activate = locator => touch ? locator.tap() : locator.click();
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.evaluate(() => localStorage.removeItem('credential-theme'));
      await page.reload();
      await reflectTheme(scheme, `${scheme} OS default`);
      assert(await page.evaluate(() => localStorage.getItem('credential-theme')) === null, 'Initial OS appearance created an explicit stored preference');
    }
    const records = await page.locator('#credential-data').evaluate(node => JSON.parse(node.textContent).credentials);
    assert(records.length === 17 && await page.locator('.credential-slide').count() === 17, 'Theme changed the 17 reel records');
    assert(await page.locator('#badge-list > .badge-row').count() === 36, 'Theme changed the 36 secondary learning records');
    const byId = new Map(records.map(record => [record.id, record]));
    const show = async id => {
      await activate(page.getByRole('button', { name: `Show ${byId.get(id).title}`, exact: true }));
      await settled(id);
      await page.locator('.credential-slide.is-active .art-image img').evaluate(img => img.decode());
      await frames();
    };
    const longest = [...records].sort((a, b) => b.title.length - a.title.length).slice(0, 2).map(record => record.id);

    for (const theme of ['light', 'dark']) {
      // Choose with the real control, then oppose the OS preference to prove
      // that an explicit selection wins on reload and all detail-page visits.
      if (await page.locator('html').getAttribute('data-theme') !== theme) await activate(page.locator('#theme-toggle'));
      else {
        await activate(page.locator('#theme-toggle'));
        await activate(page.locator('#theme-toggle'));
      }
      assert(await page.evaluate(() => localStorage.getItem('credential-theme')) === theme, `${theme}: selected appearance was not persisted`);
      await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light', reducedMotion: 'reduce' });
      await page.reload();
      await reflectTheme(theme, `${theme} selected preference after reload`);
      await show('google-ml');
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await frames();
      await page.screenshot({ path: `${output}/${theme}-hero.png`, scale: 'css', animations: 'disabled' });
      await page.locator('#reel').screenshot({ path: `${output}/${theme}-orbit.png`, animations: 'disabled' });

      await checkContrast(theme, [
        { selector: '.showcase h1', heading: true, label: 'hero heading' },
        { selector: '.showcase h1 span', heading: true, label: 'hero accent heading' },
        { selector: '.showcase-intro > p:not(.collection-summary)', label: 'hero introduction' },
        { selector: '.collection-summary', label: 'hero collection summary' },
        { selector: '.credential-slide.is-active .issuer', label: 'card issuer' },
        { selector: '.credential-slide.is-active h2', heading: true, label: 'card title' },
        { selector: '.credential-slide.is-active .credential-kind', label: 'card type' },
        { selector: '.credential-slide.is-active .credential-metadata .record-status', label: 'card completion metadata' },
        { selector: '.credential-slide.is-active .verify-link a', label: 'card verification link' },
        { selector: '#auto-status', label: 'orbit automatic status' },
        { selector: '#position', label: 'orbit position' },
        { selector: '.credential-row[data-id="google-ml"] .row-main p', label: 'collection metadata' },
        { selector: '.personal-rating-label', label: 'personal rating label' },
        { selector: '.favorite-mark', label: 'personal favorite label' },
        { selector: '#search', pseudo: '::placeholder', label: 'credential search placeholder' },
        { selector: '#badge-search', pseudo: '::placeholder', label: 'learning search placeholder' },
        { selector: '.filters button[aria-pressed="true"]', label: 'selected category filter' },
        { selector: '.credential-row .status-completed', label: 'completed status chip' },
        { selector: '.credential-row .status-in-progress', label: 'in-progress status chip' },
        { selector: '.credential-row .status-to-do', label: 'planned status chip' },
        { selector: '#pagination button[aria-current="true"]', pseudo: '::after', kind: 'indicator', label: 'selected orbit indicator' },
      ]);

      for (const selector of ['#theme-toggle', '#previous', '#next', '#status-filter', '#search', '#badge-search']) {
        const control = page.locator(selector);
        const size = await control.evaluate(node => {
          const box = (node.matches('input') ? node.closest('.search') : node).getBoundingClientRect();
          let labelFits = true;
          if (node.matches('select')) {
            const style = getComputedStyle(node);
            const canvas = document.createElement('canvas').getContext('2d');
            canvas.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
            const textWidth = canvas.measureText(node.selectedOptions[0].textContent).width;
            const horizontalChrome = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']
              .reduce((sum, property) => sum + parseFloat(style[property]), 0);
            labelFits = textWidth + horizontalChrome <= box.width + 1;
          }
          return { width: box.width, height: box.height, labelFits };
        });
        assert(size.width >= 43.99 && size.height >= 43.99, `${theme} ${selector}: primary control is smaller than 44px (${size.width} × ${size.height})`);
        assert(size.labelFits, `${theme} ${selector}: selected label does not fit beside its arrow`);
        await control.scrollIntoViewIfNeeded();
        await page.keyboard.press('Tab');
        await control.focus();
        await checkContrast(theme, [{ selector, kind: 'focus', label: `${selector} keyboard focus` }]);
      }

      // Serif glyph widths can change wrapping without changing orbit math.
      // Verify every settled front card remains readable and clear of controls.
      for (const record of records) {
        await show(record.id);
        const geometry = await page.locator('.credential-slide.is-active.is-front').evaluate(slide => {
          const rect = node => {
            const box = node.getBoundingClientRect();
            return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
          };
          const caption = slide.querySelector('.slide-caption');
          const title = caption.querySelector('h2');
          const titleRange = document.createRange();
          titleRange.selectNodeContents(title);
          const target = slide.querySelector('.art-link');
          const captionNodes = [caption, ...caption.querySelectorAll('h2,p,.record-status,.verify-link')];
          const clips = node => {
            const style = getComputedStyle(node);
            const contains = value => ['hidden', 'clip', 'auto', 'scroll'].includes(value);
            return (contains(style.overflowY) && node.scrollHeight > node.clientHeight + 1)
              || (contains(style.overflowX) && node.scrollWidth > node.clientWidth + 1);
          };
          return { id: slide.dataset.id, tile: rect(slide), reel: rect(document.querySelector('#reel')),
            controls: rect(document.querySelector('.stage-bottom')), caption: rect(caption),
            titleLineBounds: rect(titleRange), nextCaption: rect(caption.querySelector('.credential-kind')),
            clipped: captionNodes.filter(clips).map(node => node.className || node.tagName),
            artLoaded: target.querySelector('img').complete && target.querySelector('img').naturalWidth > 0,
            artworkSquare: target.querySelector('.art-image').offsetWidth === target.querySelector('.art-image').offsetHeight,
            touchAction: getComputedStyle(document.querySelector('#reel')).touchAction,
            currentLabel: slide.getAttribute('aria-label') };
        });
        assert(!geometry.clipped.length, `${theme} ${record.id}: caption clips its content (${geometry.clipped.join(', ')})`);
        assert(geometry.titleLineBounds.bottom <= geometry.nextCaption.top + 1, `${theme} ${record.id}: title text collides with the credential type`);
        for (const [label, bounds] of [['front tile', geometry.tile], ['reel crop', geometry.reel]]) {
          assert(geometry.titleLineBounds.left >= bounds.left - 1 && geometry.titleLineBounds.right <= bounds.right + 1
            && geometry.titleLineBounds.top >= bounds.top - 1 && geometry.titleLineBounds.bottom <= bounds.bottom + 1,
          `${theme} ${record.id}: title text leaves the ${label}`);
        }
        assert(geometry.caption.bottom <= geometry.tile.bottom + 1 && geometry.caption.left >= geometry.tile.left - 1 && geometry.caption.right <= geometry.tile.right + 1, `${theme} ${record.id}: caption leaves the front tile`);
        assert(geometry.tile.left >= geometry.reel.left - 1 && geometry.tile.right <= geometry.reel.right + 1 && geometry.tile.top >= geometry.reel.top - 1 && geometry.tile.bottom <= geometry.reel.bottom + 1, `${theme} ${record.id}: front tile leaves the reel area (${JSON.stringify(geometry)})`);
        assert(geometry.tile.bottom <= geometry.controls.top + 1, `${theme} ${record.id}: front tile collides with orbit controls`);
        assert(geometry.artLoaded && geometry.artworkSquare && geometry.touchAction === 'pan-y', `${theme} ${record.id}: artwork frame or vertical scrolling contract changed`);
        await noOverflow(`${theme} ${record.id}`);
        geometryResults.push({ theme, ...geometry });
        if (longest.includes(record.id)) {
          await page.locator('#reel').scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${output}/${theme}-${record.id}-long-caption.png`, scale: 'css', animations: 'disabled' });
        }
      }

      await page.locator('#collection').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/${theme}-credential-collection.png`, scale: 'css', animations: 'disabled' });
      await page.locator('#google-badges').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/${theme}-learning-collection.png`, scale: 'css', animations: 'disabled' });
      const decision = page.locator('.learning-certificate-row[data-certificate-id="decision-intelligence"]');
      await activate(decision.locator('summary'));
      assert(await decision.locator('.badge-entry-content').isVisible(), `${theme}: LinkedIn evidence disclosure did not open`);
      await checkContrast(theme, [
        { selector: '.learning-certificate-row[data-certificate-id="decision-intelligence"] .badge-title', label: 'expanded LinkedIn title' },
        { selector: '.learning-certificate-row[data-certificate-id="decision-intelligence"] .badge-overview > p', label: 'expanded LinkedIn description' },
        { selector: '.learning-certificate-row[data-certificate-id="decision-intelligence"] .badge-actions a', label: 'expanded LinkedIn PDF link' },
      ]);
      await page.screenshot({ path: `${output}/${theme}-linkedin-expanded.png`, scale: 'css', animations: 'disabled' });
      await activate(decision.locator('summary'));
      await noOverflow(`${theme} expanded learning collection`);

      await show('google-ml');
      await activate(page.locator('.credential-slide.is-active .art-link'));
      await page.waitForURL(new URL(byId.get('google-ml').detailPath, `${origin}/`).href);
      await reflectTheme(theme, `${theme} detail-page preference`);
      assert(await page.evaluate(() => localStorage.getItem('credential-theme')) === theme, `${theme}: detail navigation changed the explicit preference`);
      await checkContrast(theme, [
        { selector: '.detail-heading h1', heading: true, label: 'detail heading' },
        { selector: '.detail-issuer', label: 'detail issuer' },
        { selector: '.detail-kind', label: 'detail credential type' },
        { selector: '.detail-metadata .record-status', label: 'detail status chip' },
        { selector: '.detail-overview', label: 'detail overview' },
        { selector: '.detail-back', label: 'detail return link' },
      ]);
      await page.locator('.detail-artwork img').evaluate(img => img.decode());
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: `${output}/${theme}-detail.png`, scale: 'css', animations: 'disabled' });
      await activate(page.locator('.detail-back'));
      await page.waitForURL(url => url.origin === origin && url.pathname === '/');
      await reflectTheme(theme, `${theme} return-to-collection preference`);
      assert(await page.locator('.credential-slide').count() === 17 && await page.locator('#badge-list > .badge-row').count() === 36, `${theme}: returning to collection changed record counts`);
      persistence.push({ theme, osPreference: theme === 'light' ? 'dark' : 'light', reload: true, detail: true, returnedToCollection: true });
    }

    await show('google-ml');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const halo = page.locator('.credential-slide.is-active .art-halo');
    assert(await halo.evaluate(node => getComputedStyle(node).animationName === 'halo-pulse'), 'Normal motion lost the artwork pulse');
    assert(await halo.evaluate(node => getComputedStyle(node, '::after').animationName === 'halo-spin'), 'Normal motion lost the outer halo rotation');
    await halo.evaluate(node => {
      for (const animation of node.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = 1200; }
    });
    await page.locator('#reel').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/dark-normal-motion-pulse.png`, scale: 'css' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert(await halo.evaluate(node => getComputedStyle(node).animationName === 'none' && getComputedStyle(node, '::after').animationName === 'none'), 'Reduced motion still animates the artwork halo');
    assert(await page.locator('#auto-status').textContent() === 'Paused', 'Reduced motion did not pause the orbit');
    assert(await page.locator('#auto-status').evaluate(node => getComputedStyle(node, '::before').animationName === 'none'), 'Reduced motion still animates the automatic-status indicator');
    assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
    // Leave a predictable light appearance for the existing collection callback.
    await activate(page.locator('#theme-toggle'));
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto(origin);
    await reflectTheme('light', 'Final light appearance');
    return { width, touch, osDefaultsChecked: ['light', 'dark'], persistence, reelCardsCheckedPerTheme: records.length,
      longCaptionIds: longest, learningRowsChecked: 36, contrastResults, geometryResults,
      motionChecked: true, consoleErrors: errors, output };
  } finally {
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
  }
}
