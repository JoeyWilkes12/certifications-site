// Playwright CLI callback for localhost at 390px, 621px, and 1440px.
// Local layout measurements isolate badge fit from the reel's 3D perspective.
async (page) => {
  const origin = new URL(page.url()).origin;
  if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) {
    throw new Error('Run badge containment checks against localhost.');
  }
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const width = page.viewportSize().width;
  const output = `output/playwright/reel-badge-containment/${width}`;
  const errors = [];
  const onPageError = error => errors.push(error.message);
  const onConsole = message => { if (message.type() === 'error') errors.push(message.text()); };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  const geometryMetrics = [];
  const navigationChecks = [];
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const settled = id => page.waitForFunction(id => {
    const slide = document.querySelector('.credential-slide.is-active.is-front');
    return slide?.dataset.id === id && slide.style.display === 'block'
      && /translate3d\(-?0(?:\.0+)?px,\s*-?0(?:\.0+)?px,\s*-?0(?:\.0+)?px\)/.test(slide.style.transform)
      && !document.querySelector('#reel').classList.contains('is-dragging');
  }, id);
  const noOverflow = async label => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: horizontal overflow`);

  // The observed hover/focus scale and outline are used to verify reserve around
  // every side card; image pixels and orbital geometry have no fixed expectations.
  const inspect = (phase, reserve) => page.evaluate(({ phase, reserve }) => {
    const number = value => parseFloat(value) || 0;
    const rect = node => {
      const box = node.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    const local = (node, ancestor) => {
      let left = 0, top = 0, current = node;
      while (current && current !== ancestor) {
        left += current.offsetLeft; top += current.offsetTop; current = current.offsetParent;
      }
      if (current !== ancestor) throw new Error(`Cannot measure local artwork coordinates: ${node.className}`);
      return { left, top, right: left + node.offsetWidth, bottom: top + node.offsetHeight, width: node.offsetWidth, height: node.offsetHeight };
    };
    const expand = (box, margin) => ({ left: box.left - margin, top: box.top - margin, right: box.right + margin, bottom: box.bottom + margin });
    const transformed = (box, link, linkBox, transform) => {
      const style = getComputedStyle(link);
      const origin = style.transformOrigin.split(/\s+/).map(number);
      const matrix = new DOMMatrix(transform === 'none' ? undefined : transform);
      const points = [[box.left, box.top], [box.right, box.top], [box.right, box.bottom], [box.left, box.bottom]].map(([x, y]) => {
        const point = matrix.transformPoint(new DOMPoint(x - linkBox.left - origin[0], y - linkBox.top - origin[1]));
        return { x: point.x + linkBox.left + origin[0], y: point.y + linkBox.top + origin[1] };
      });
      return { left: Math.min(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), right: Math.max(...points.map(p => p.x)), bottom: Math.max(...points.map(p => p.y)) };
    };
    const within = (inner, outer) => inner.left >= outer.left - 1 && inner.top >= outer.top - 1 && inner.right <= outer.right + 1 && inner.bottom <= outer.bottom + 1;
    const boxSize = style => {
      const extraX = style.boxSizing === 'border-box' ? 0 : number(style.paddingLeft) + number(style.paddingRight) + number(style.borderLeftWidth) + number(style.borderRightWidth);
      const extraY = style.boxSizing === 'border-box' ? 0 : number(style.paddingTop) + number(style.paddingBottom) + number(style.borderTopWidth) + number(style.borderBottomWidth);
      return { width: number(style.width) + extraX, height: number(style.height) + extraY };
    };
    const shadowOutset = shadow => {
      if (shadow === 'none') return 0;
      return Math.max(0, ...shadow.split(/,(?![^()]*\))/).filter(part => !part.includes('inset')).map(part => {
        const values = part.replace(/(?:rgba?|color)\([^)]*\)/g, '').match(/-?\d*\.?\d+px/g)?.map(number) || [];
        return Math.max(Math.abs(values[0] || 0), Math.abs(values[1] || 0)) + (values[2] || 0) + Math.max(0, values[3] || 0);
      }));
    };
    return [...document.querySelectorAll('.credential-slide')].filter(slide => getComputedStyle(slide).display !== 'none' && number(getComputedStyle(slide).opacity) > 0.01).map(slide => {
      const mount = slide.querySelector('.slide-art');
      const link = slide.querySelector('.art-link');
      const image = link.querySelector('.art-image');
      const img = image.querySelector('img');
      const halo = link.querySelector('.art-halo');
      const linkStyle = getComputedStyle(link);
      const frameStyle = getComputedStyle(image);
      const haloStyle = getComputedStyle(halo);
      const outerStyle = getComputedStyle(halo, '::after');
      const mountBox = { left: 0, top: 0, right: mount.clientWidth, bottom: mount.clientHeight };
      const tileBox = { left: 0, top: 0, right: slide.clientWidth, bottom: slide.clientHeight };
      const mountInTile = local(mount, slide);
      const linkBox = local(link, mount);
      const imageBox = local(image, mount);
      const haloBox = local(halo, mount);
      const outerSize = boxSize(outerStyle);
      const outerBox = { left: haloBox.left + number(haloStyle.borderLeftWidth) + number(outerStyle.left),
        top: haloBox.top + number(haloStyle.borderTopWidth) + number(outerStyle.top) };
      outerBox.right = outerBox.left + outerSize.width;
      outerBox.bottom = outerBox.top + outerSize.height;
      const front = slide.classList.contains('is-front');
      const transform = reserve?.transform || linkStyle.transform;
      const observedOutline = Math.max(0, number(linkStyle.outlineOffset) + number(linkStyle.outlineWidth));
      const observedFocus = Math.max(observedOutline, shadowOutset(linkStyle.boxShadow));
      const outline = reserve ? front ? reserve.frontFocus : reserve.sideFocus : link.matches(':focus-visible') ? observedFocus : 0;
      const painted = {
        link: transformed(linkBox, link, linkBox, transform),
        image: transformed(imageBox, link, linkBox, transform),
        halo: transformed(haloBox, link, linkBox, transform),
        outer: transformed(outerBox, link, linkBox, transform),
        focus: transformed(expand(linkBox, outline), link, linkBox, transform),
      };
      const glow = transformed(expand(haloBox, shadowOutset(haloStyle.boxShadow)), link, linkBox, transform);
      const mountStyle = getComputedStyle(mount), tileStyle = getComputedStyle(slide);
      const clips = style => ['hidden', 'clip'].includes(style.overflowX) && ['hidden', 'clip'].includes(style.overflowY);
      const containsGlow = within(glow, mountBox) || clips(mountStyle);
      const toTile = box => ({ left: box.left + mountInTile.left, top: box.top + mountInTile.top, right: box.right + mountInTile.left, bottom: box.bottom + mountInTile.top });
      const projectedMount = rect(mount), projectedTile = rect(slide), projectedLink = rect(link), projectedImage = rect(image), projectedHalo = rect(halo);
      const mountScaleX = projectedMount.width / Math.max(mount.offsetWidth, 1), mountScaleY = projectedMount.height / Math.max(mount.offsetHeight, 1);
      const projectFront = box => ({ left: projectedMount.left + box.left * mountScaleX, top: projectedMount.top + box.top * mountScaleY,
        right: projectedMount.left + box.right * mountScaleX, bottom: projectedMount.top + box.bottom * mountScaleY });
      const projectedOuter = projectFront(painted.outer);
      const projectedFocus = projectFront(painted.focus);
      const visibleFocus = link.matches(':focus-visible') ? number(linkStyle.outlineWidth) >= 2 && linkStyle.outlineStyle !== 'none' : true;
      return { id: slide.dataset.id, front, phase, mount: { width: mount.clientWidth, height: mount.clientHeight },
        link: { width: link.offsetWidth, height: link.offsetHeight, projectedWidth: +projectedLink.width.toFixed(2), projectedHeight: +projectedLink.height.toFixed(2) },
        image: { width: image.offsetWidth, height: image.offsetHeight, loaded: img.complete && img.naturalWidth > 0,
          src: img.getAttribute('src'), href: link.getAttribute('href'), radius: frameStyle.borderRadius, overflow: frameStyle.overflow,
          clip: frameStyle.clipPath, objectFit: getComputedStyle(img).objectFit, objectPosition: getComputedStyle(img).objectPosition, transform: getComputedStyle(img).transform },
        localFits: Object.fromEntries(Object.entries(painted).map(([name, bounds]) => [name, (front && name !== 'image' || within(bounds, mountBox)) && within(toTile(bounds), tileBox)])),
        projectedFits: front ? { link: within(projectedLink, projectedTile),
          image: within(projectedImage, projectedMount) && within(projectedImage, projectedTile),
          halo: within(projectedHalo, projectedTile),
          outer: within(projectedOuter, projectedTile),
          focus: within(projectedFocus, projectedTile) } : undefined,
        glow: { outset: shadowOutset(haloStyle.boxShadow), containedInMount: containsGlow,
          containedInTile: within(toTile(glow), tileBox) || clips(mountStyle) || clips(tileStyle), mountClip: mountStyle.overflow, tileClip: tileStyle.overflow },
        haloAbove: number(haloStyle.zIndex) > number(frameStyle.zIndex), haloPointerEvents: haloStyle.pointerEvents,
        pulseAnimation: haloStyle.animationName, spinAnimation: outerStyle.animationName, visibleFocus,
        observedTransform: linkStyle.transform, focusExtent: observedFocus,
        ariaHidden: slide.getAttribute('aria-hidden'), bounds: { mountBox, linkBox, imageBox, haloBox, outerBox, painted } };
    });
  }, { phase, reserve });

  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert((await page.goto(origin))?.ok(), 'Local gallery did not return a successful response');
    const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    const activate = locator => touch ? locator.tap() : locator.click();
    const records = await page.locator('#credential-data').evaluate(node => JSON.parse(node.textContent).credentials);
    assert(records.length === 17, 'Expected 17 original credentials');
    const byId = new Map(records.map(record => [record.id, record]));
    const show = async id => {
      await activate(page.getByRole('button', { name: `Show ${byId.get(id).title}`, exact: true }));
      await settled(id);
      await page.locator('.credential-slide').evaluateAll(slides => Promise.all(slides.filter(slide => getComputedStyle(slide).display !== 'none').map(slide => slide.querySelector('.art-image img').decode())));
      await frames();
    };
    const freezePulse = () => page.locator('.art-halo').evaluateAll(halos => {
      for (const halo of halos) for (const animation of halo.getAnimations({ subtree: true })) {
        animation.pause(); animation.currentTime = Number(animation.effect.getTiming().duration) * 0.7;
      }
    });
    // Observe the side's actual inset focus treatment independently of the
    // unchanged front card's outline and outer focus shadows.
    await show('aws-ai');
    const sideReference = page.locator('.credential-slide[data-id="google-ml"] .art-link');
    await page.keyboard.press('Tab');
    await sideReference.focus();
    await page.waitForTimeout(280);
    assert(await sideReference.evaluate(node => node.matches(':focus-visible')), 'Side focus reference did not receive visible keyboard focus');
    const sideFocus = (await inspect('side-focus-reference')).find(item => item.id === 'google-ml').focusExtent;
    await page.locator('#reel').focus();
    const check = async (theme, motion, phase, reserve) => {
      const measurements = await inspect(phase, reserve);
      assert(measurements.some(item => item.front), `${theme}/${motion}/${phase}: no visible front card`);
      for (const item of measurements) {
        const label = `${theme}/${motion}/${phase} ${item.id} (${item.front ? 'front' : 'side'})`;
        const record = byId.get(item.id);
        assert(item.image.loaded && item.image.width === item.image.height, `${label}: artwork frame is unloaded or not square`);
        assert(item.image.src === record.image && item.image.href === record.detailPath, `${label}: original artwork or detail destination changed`);
        assert(item.haloAbove && item.haloPointerEvents === 'none', `${label}: halo hides artwork or intercepts input`);
        for (const [part, fits] of Object.entries(item.localFits)) assert(fits, `${label}: ${part} leaves its ${item.front && part !== 'image' ? 'outer tile' : 'mount or tile'} (${JSON.stringify(item.bounds)})`);
        for (const [part, fits] of Object.entries(item.projectedFits || {})) assert(fits, `${label}: projected ${part} leaves its mount or tile`);
        assert((item.front || item.glow.containedInMount) && item.glow.containedInTile, `${label}: pulse glow escapes its declared mount/tile containment`);
        assert(item.visibleFocus, `${label}: keyboard focus indicator disappeared`);
        if (!item.front) {
          assert(item.mount.width === item.mount.height, `${label}: side badge mount is not square`);
          assert(item.link.width >= 43.99 && item.link.height >= 43.99, `${label}: side artwork layout tap target is smaller than 44px (${JSON.stringify(item.link)})`);
          if (measurements.some(card => card.front && card.id === 'aws-ai') && ['google-ml', 'anthropic-skills'].includes(item.id)) {
            assert(item.link.projectedWidth >= 43.99 && item.link.projectedHeight >= 43.99, `${label}: nearest AWS neighbor's projected artwork tap target is smaller than 44px (${JSON.stringify(item.link)})`);
          }
        }
        if (item.id.startsWith('ai-value-') || ['finops-practitioner', 'focus-intro'].includes(item.id)) assert(item.image.radius === '50%' && item.image.overflow === 'hidden', `${label}: circular badge crop changed`);
        if (item.id === 'anthropic-skills') assert(item.image.clip.startsWith('inset(17.5% 7%'), `${label}: original certificate crop changed`);
        if (item.id.startsWith('ai-value-')) assert(/^matrix\(1\.42, 0, 0, 1\.42, 0, 0\)$/.test(item.image.transform), `${label}: central AI Value crop scale changed`);
        if (item.id === 'focus-intro') assert(item.image.objectFit === 'cover' && item.image.objectPosition === '70% 50%', `${label}: FOCUS badge framing changed`);
        assert(item.pulseAnimation === (motion === 'reduce' ? 'none' : item.front ? 'halo-pulse' : 'halo-pulse-contained') && item.spinAnimation === (motion === 'reduce' ? 'none' : 'halo-spin'), `${label}: motion preference changed halo behavior`);
        geometryMetrics.push({ theme, motion, ...item, bounds: undefined });
      }
      await noOverflow(`${theme}/${motion}/${phase}`);
      return measurements;
    };

    for (const theme of ['light', 'dark']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) await activate(page.locator('#theme-toggle'));
      for (const motion of ['reduce', 'no-preference']) {
        await page.emulateMedia({ reducedMotion: motion });
        for (const record of records) {
          await show(record.id);
          if (motion === 'no-preference') await freezePulse();
          await check(theme, motion, 'rest');
          const link = page.locator('.credential-slide.is-active.is-front .art-link');
          await link.hover();
          await page.waitForTimeout(280);
          await page.keyboard.press('Tab');
          await link.focus();
          await frames();
          if (motion === 'no-preference') await freezePulse();
          const focused = await inspect('hover-focus');
          const front = focused.find(item => item.front);
          assert(await link.evaluate(node => node.matches(':focus-visible')), `${theme}/${motion} ${record.id}: keyboard focus did not reach artwork`);
          await check(theme, motion, 'hover-focus', { transform: front.observedTransform, frontFocus: front.focusExtent, sideFocus });
          if (record.id === 'aws-ai' && motion === 'no-preference') await page.locator('#reel').screenshot({ path: `${output}/${theme}-aws-hover-focus-pulse.png` });
          await page.locator('#reel').focus();
          await page.mouse.move(0, 0);
        }
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await show('aws-ai');
      const neighbors = await page.locator('.credential-slide:not(.is-front)').evaluateAll(slides => slides.filter(slide => getComputedStyle(slide).display !== 'none').map(slide => slide.dataset.id));
      assert(neighbors.includes('google-ml') && neighbors.includes('anthropic-skills'), `${theme}: AWS no longer has its original Google/Anthropic neighbors`);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await frames();
      await page.screenshot({ path: `${output}/${theme}-aws-hero.png`, scale: 'css', animations: 'disabled' });
      await page.locator('#reel').screenshot({ path: `${output}/${theme}-aws-reel.png`, animations: 'disabled' });

      // White tile padding selects a side card; the artwork anchor retains its
      // original direct-detail destination. These are separate existing actions.
      await page.locator('#reel').scrollIntoViewIfNeeded();
      const sidePoint = await page.evaluate(() => {
        for (const id of ['google-ml', 'anthropic-skills']) {
          const slide = document.querySelector(`.credential-slide[data-id="${id}"]`);
          const box = slide.getBoundingClientRect();
          for (const fx of [0.06, 0.15, 0.85, 0.94]) for (const fy of [0.06, 0.15, 0.85, 0.94]) {
            const x = box.left + box.width * fx, y = box.top + box.height * fy;
            if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
            const target = document.elementFromPoint(x, y);
            if (target?.closest('.credential-slide') === slide && !target.closest('a,button')) return { id, x, y };
          }
        }
        return null;
      });
      assert(sidePoint, `${theme}: no exposed side white-tile tap area remains`);
      if (touch) await page.touchscreen.tap(sidePoint.x, sidePoint.y);
      else await page.mouse.click(sidePoint.x, sidePoint.y);
      await settled(sidePoint.id);
      assert(new URL(page.url()).pathname === '/', `${theme}: side tile tap incorrectly followed a detail link`);
      await activate(page.locator('.credential-slide.is-active.is-front .art-link'));
      await page.waitForURL(new URL(byId.get(sidePoint.id).detailPath, `${origin}/`).href);
      const detail = await page.locator('.detail-artwork img').evaluate(img => ({ src: new URL(img.src).pathname, clip: getComputedStyle(img).clipPath,
        transform: getComputedStyle(img).transform, fit: getComputedStyle(img).objectFit }));
      assert(detail.src.endsWith('/' + byId.get(sidePoint.id).image) && detail.clip === 'none' && detail.transform === 'none' && detail.fit === 'contain', `${theme}: plain artwork tap lost the original detail image treatment`);
      await activate(page.locator('.detail-back'));
      await page.waitForURL(url => url.origin === origin && url.pathname === '/');
      await settled('google-ml');
      navigationChecks.push({ theme, sideTileSelected: sidePoint.id, frontArtworkDetailOpened: true, returnedToCollection: true });
    }
    assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
    return { width, touch, themesChecked: ['light', 'dark'], motionPreferencesChecked: ['reduce', 'no-preference'],
      frontRecordsPerThemeAndMotion: records.length, geometryMetrics, navigationChecks, consoleErrors: errors, output };
  } finally {
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
  }
}
