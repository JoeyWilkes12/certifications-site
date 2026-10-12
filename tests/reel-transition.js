// Playwright CLI callback for localhost at 1440px Chromium and 390px iPhone/WebKit
// (or a Chromium touch profile). It samples every animation frame of an orbit step
// and checks that the tile leaving the centre and the tile arriving there resize
// and fade progressively, with no single-frame snap, for automatic, button,
// keyboard, side-tile and slow drag steps in both directions.
async (page) => {
  const origin = new URL(page.url()).origin;
  if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) {
    throw new Error('Run the reel transition check against localhost.');
  }
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const width = page.viewportSize().width;
  const engine = page.context().browser()?.browserType().name() || 'unknown';
  const output = `output/playwright/reel-transition/${width}`;
  const errors = [];
  const onPageError = error => errors.push(error.message);
  const onConsole = message => { if (message.type() === 'error') errors.push(message.text()); };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  let cdp;
  const maxStepShare = 0.35; // largest frame-to-frame change allowed, as a share of the whole change

  // Rest geometry measured before the continuous morph (origin/main 7b2b8be,
  // Chromium, identical in light and dark). Layout sizes ignore the 3D transform.
  // Front heights follow reel order and depend on caption wrapping, so they are
  // compared only in Chromium; tile, mount, link and artwork sizes are compared everywhere.
  const restBaseline = {
    1440: { side: [168, 136, 128, 124], front: [310, 254, 205, 205, 185], heights: [475.98, 475.98, 475.98, 475.98, 475.98, 475.98, 475.98, 475.98, 475.98, 475.98, 475.98, 444.08, 444.08, 444.08, 475.98, 444.08, 444.08] },
    1024: { side: [150, 122, 112, 108], front: [280, 232, 185, 205, 185], heights: [471.05, 441.42, 441.42, 441.42, 441.42, 441.42, 441.42, 441.42, 441.42, 441.42, 441.42, 411.8, 411.8, 411.8, 441.42, 411.8, 411.8] },
    621: { side: [112, 92, 84, 80], front: [230, 194, 150, 132, 112], heights: [377.77, 377.77, 377.77, 377.77, 377.77, 377.77, 377.77, 377.77, 356.17, 377.77, 356.17, 356.17, 356.17, 356.17, 377.77, 356.17, 356.17] },
    390: { side: [112, 92, 84, 80], front: [222.59, 186.59, 150, 132, 112], heights: [377.77, 377.77, 377.77, 377.77, 377.77, 377.77, 377.77, 377.77, 377.77, 377.77, 377.77, 356.17, 356.17, 356.17, 377.77, 356.17, 356.17] },
  }[width];

  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const active = () => page.locator('.credential-slide.is-active').getAttribute('data-id');
  const settled = id => page.waitForFunction(id => {
    const slide = document.querySelector('.credential-slide.is-active.is-front');
    return (!id || slide?.dataset.id === id) && slide?.style.display === 'block'
      && /translate3d\(-?0(?:\.0+)?px,\s*-?0(?:\.0+)?px,\s*-?0(?:\.0+)?px\)/.test(slide.style.transform)
      && !document.querySelector('.credential-slide.is-morphing') && !document.querySelector('#reel').classList.contains('is-dragging');
  }, id, { timeout: 8000 });
  const noOverflow = async label => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: horizontal overflow`);

  // Measure each visible tile right after app.js lays out a frame.
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.__reelFrames = null;
    const sample = now => {
      const tiles = {};
      for (const slide of document.querySelectorAll('.credential-slide')) {
        if (slide.style.display !== 'block') continue;
        const style = getComputedStyle(slide);
        const caption = slide.querySelector('.slide-caption');
        const captionStyle = getComputedStyle(caption);
        const body = caption.querySelector('.caption-body');
        const shown = captionStyle.display === 'none' ? 0 : +captionStyle.opacity * (body ? +getComputedStyle(body).opacity : 1);
        tiles[slide.dataset.id] = { w: +parseFloat(style.width).toFixed(2), h: +parseFloat(style.height).toFixed(2),
          caption: +shown.toFixed(3), captionH: captionStyle.display === 'none' ? 0 : +caption.getBoundingClientRect().height.toFixed(1),
          front: slide.classList.contains('is-front') };
      }
      const last = window.__reelFrames.at(-1);
      if (last && last.now === now) last.tiles = tiles; else window.__reelFrames.push({ now, tiles });
    };
    window.requestAnimationFrame = callback => raf(now => { callback(now); if (window.__reelFrames) sample(now); });
  });

  try {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    assert((await page.goto(origin))?.ok(), 'Local gallery did not return a successful response');
    const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    if (touch && engine === 'chromium') cdp = await page.context().newCDPSession(page);
    const mode = cdp ? 'native-chromium-touch' : touch ? 'synthetic-webkit-pointer' : 'native-mouse';
    const activate = locator => touch ? locator.tap() : locator.click();
    const labels = await page.locator('#pagination button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label').slice(5)));
    const records = await page.locator('#credential-data').evaluate(node => JSON.parse(node.textContent).credentials);
    const order = labels.map(title => records.find(record => record.title === title).id);
    assert(order.length === 17, 'Expected all 17 credentials in the reel');
    await page.evaluate(() => document.fonts.ready);

    const startSampling = () => page.evaluate(() => { window.__reelFrames = []; });
    const stopSampling = () => page.evaluate(() => { const frames = window.__reelFrames; window.__reelFrames = null; return frames; });
    const metric = (values, rising) => {
      const total = values.at(-1) - values[0];
      const steps = values.slice(1).map((value, i) => value - values[i]);
      const backwards = steps.filter(step => (rising ? -step : step) > 0.51);
      const largest = Math.max(0, ...steps.map(Math.abs));
      return { start: values[0], end: values.at(-1), total: +total.toFixed(2), largestStep: +largest.toFixed(2),
        largestShare: total ? +(largest / Math.abs(total)).toFixed(3) : 0, backwards: backwards.length };
    };
    const analyse = (label, samples, from, to) => {
      assert(from !== to, `${label}: the orbit did not change its front tile`);
      const tile = (id, rising) => {
        const series = samples.filter(frame => frame.tiles[id]).map(frame => frame.tiles[id]);
        const result = { id, frames: series.length,
          height: metric(series.map(s => s.h), rising), width: metric(series.map(s => s.w), rising),
          caption: metric(series.map(s => s.caption), rising) };
        for (const [name, values] of Object.entries({ height: result.height, width: result.width, caption: result.caption })) {
          const where = `${label} ${rising ? 'incoming' : 'outgoing'} ${id} ${name}`;
          // Captions report opacity (0-1); 0.51 is a pixel-rounding tolerance for sizes.
          const tolerance = name === 'caption' ? 0.01 : 0.51;
          assert(Math.abs(values.total) > tolerance, `${where}: did not change (${JSON.stringify(values)})`);
          assert(rising ? values.total > 0 : values.total < 0, `${where}: changed in the wrong direction (${JSON.stringify(values)})`);
          assert(values.backwards === 0, `${where}: is not monotonic (${JSON.stringify(series.map(s => s[name === 'caption' ? 'caption' : name[0]]))})`);
          assert(values.largestShare <= maxStepShare, `${where}: snapped ${Math.round(values.largestShare * 100)}% of its change in one frame (${JSON.stringify(series.map(s => s[name === 'caption' ? 'caption' : name[0]]))})`);
        }
        return result;
      };
      assert(samples.length >= 12, `${label}: only ${samples.length} animation frames were sampled`);
      const outgoing = tile(from, false), incoming = tile(to, true);
      // The glide must end exactly at the pre-change rest geometry.
      const [sideWidth] = restBaseline?.side || [];
      if (sideWidth) {
        assert(Math.abs(outgoing.width.end - sideWidth) < 0.02 && Math.abs(outgoing.height.end - sideWidth) < 0.02, `${label}: outgoing tile did not settle at the ${sideWidth}px side size`);
        assert(Math.abs(incoming.width.start - sideWidth) < 0.02 && Math.abs(incoming.height.start - sideWidth) < 0.02, `${label}: incoming tile did not start at the ${sideWidth}px side size`);
        assert(Math.abs(incoming.width.end - restBaseline.front[0]) < 0.02, `${label}: incoming tile did not settle at the front width`);
        if (engine === 'chromium') assert(incoming.height.end === restBaseline.heights[order.indexOf(to)], `${label}: incoming tile height ${incoming.height.end} differs from the pre-change ${restBaseline.heights[order.indexOf(to)]}px`);
      }
      assert(outgoing.caption.end === 0 && incoming.caption.start === 0 && incoming.caption.end === 1 && outgoing.caption.start === 1, `${label}: caption endpoints changed`);
      return { label, from, to, frames: samples.length, outgoing, incoming,
        sample: { outgoing: samples.filter(f => f.tiles[from]).map(f => [f.tiles[from].h, f.tiles[from].caption]),
          incoming: samples.filter(f => f.tiles[to]).map(f => [f.tiles[to].h, f.tiles[to].caption]) } };
    };
    const step = async (label, action, expected) => {
      const from = await active();
      await settled(from);
      await startSampling();
      await frames(); // one rest sample before the step starts
      await action();
      await settled(expected);
      await frames();
      const samples = await stopSampling();
      await noOverflow(label);
      return analyse(label, samples, from, await active());
    };

    // Pointer helpers mirror reel-swipe.js: native CDP touch in Chromium, synthetic
    // pointer events in WebKit, and the real mouse on desktop.
    let target;
    const pointer = async (type, x, y) => {
      if (cdp) {
        const kind = { down: 'touchStart', move: 'touchMove', up: 'touchEnd' }[type];
        await cdp.send('Input.dispatchTouchEvent', { type: kind, touchPoints: type === 'up' ? [] : [{ x, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }] });
      } else if (touch) {
        if (type === 'down') target = await page.evaluateHandle(({ x, y }) => document.elementFromPoint(x, y), { x, y });
        await target.evaluate((node, { type, x, y }) => node.dispatchEvent(new PointerEvent(`pointer${type}`, {
          bubbles: true, cancelable: true, pointerId: 101, pointerType: 'touch', isPrimary: true, button: 0,
          buttons: type === 'up' ? 0 : 1, clientX: x, clientY: y })), { type, x, y });
      } else if (type === 'down') { await page.mouse.move(x, y); await page.mouse.down(); }
      else if (type === 'move') await page.mouse.move(x, y);
      else await page.mouse.up();
    };
    const dragOrigin = async () => {
      const link = page.locator('.credential-slide.is-active.is-front .art-link');
      const box = await link.boundingBox();
      const distance = await page.locator('.credential-slide.is-active.is-front').evaluate(slide => Math.max(160, slide.offsetWidth * 0.9));
      return { x: box.x + box.width / 2, y: box.y + box.height / 2, distance };
    };
    // A slow drag of one full slot: about 50 pointer moves over roughly a second.
    const slowDrag = direction => async () => {
      const { x, y, distance } = await dragOrigin();
      const travel = -direction * (distance + 24);
      await pointer('down', x, y);
      for (let i = 1; i <= 50; i++) {
        await pointer('move', x + travel * i / 50, y);
        await page.waitForTimeout(18);
      }
      await pointer('up', x + travel, y);
    };
    const sideTilePoint = async id => page.evaluate(id => {
      const slide = document.querySelector(`.credential-slide[data-id="${id}"]`);
      const box = slide.getBoundingClientRect();
      for (const fx of [0.06, 0.12, 0.88, 0.94]) for (const fy of [0.06, 0.12, 0.5, 0.88, 0.94]) {
        const x = box.left + box.width * fx, y = box.top + box.height * fy;
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
        const hit = document.elementFromPoint(x, y);
        if (hit?.closest('.credential-slide') === slide && !hit.closest('a,button')) return { x, y };
      }
      return null;
    }, id);

    const results = [];
    // (a) Automatic rotation from a fresh load, with the pointer and focus outside the showcase.
    if (!touch) await page.mouse.move(2, 2);
    await page.goto(origin);
    await page.waitForTimeout(600); // let any load-time caption animation finish inside the 3600ms dwell
    assert(await page.locator('#auto-status').textContent() === 'Auto-rotating', 'Automatic rotation is not running on load');
    results.push(await step('automatic', () => page.waitForFunction(id => document.querySelector('.credential-slide.is-active')?.dataset.id === id, order[1], { timeout: 6000 }), order[1]));
    // (b, c) Step buttons, both directions.
    results.push(await step('next-button', () => activate(page.locator('#next')), order[2]));
    results.push(await step('previous-button', () => activate(page.locator('#previous')), order[1]));
    // Keyboard and side-tile selection use the same glide.
    await page.locator('#reel').focus();
    results.push(await step('keyboard-right', () => page.keyboard.press('ArrowRight'), order[2]));
    results.push(await step('keyboard-left', () => page.keyboard.press('ArrowLeft'), order[1]));
    const point = await sideTilePoint(order[2]);
    assert(point, 'No exposed side-tile padding to select');
    results.push(await step('side-tile', () => touch ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y), order[2]));
    assert(new URL(page.url()).pathname === '/', 'Side-tile selection followed a detail link');
    // (d) Slow drags, each direction.
    await page.locator('#reel').scrollIntoViewIfNeeded();
    results.push(await step('slow-drag-next', slowDrag(1), order[3]));
    results.push(await step('slow-drag-previous', slowDrag(-1), order[2]));

    // Filmstrip: hold a drag at tenths of a slot, then capture a live button glide.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.locator('#reel').scrollIntoViewIfNeeded();
    await settled(order[2]);
    const { x, y, distance } = await dragOrigin();
    await pointer('down', x, y);
    for (let i = 0; i <= 10; i++) {
      await pointer('move', x - (i ? 8 : 0) - distance * i / 10, y);
      await frames();
      await noOverflow(`filmstrip ${i}`);
      await page.locator('#reel').screenshot({ path: `${output}/drag-${String(i * 10).padStart(3, '0')}.png`, animations: 'disabled' });
    }
    await pointer('up', x - distance, y);
    await settled(order[3]);
    await activate(page.locator('#next'));
    for (let i = 0; i < 4; i++) await page.locator('#reel').screenshot({ path: `${output}/glide-${i + 1}.png` });
    await settled(order[4]);

    // Reduced motion switches instantly: no glide, no morph, no running slide animations.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await startSampling();
    await activate(page.locator('#next'));
    await frames();
    const reduced = await stopSampling();
    await settled(order[5]);
    assert(reduced.every(frame => Object.values(frame.tiles).every(tile => [0, 1].includes(tile.caption))), 'Reduced motion rendered a partial caption fade');
    assert(await page.evaluate(() => document.getAnimations().filter(animation => animation.effect?.target?.closest?.('.credential-slide')).length === 0), 'Reduced motion left a reel tile animation running');

    // Rest states match the pre-change geometry for every front selection.
    const rest = [];
    for (const [index, id] of order.entries()) {
      await activate(page.getByRole('button', { name: `Show ${records.find(record => record.id === id).title}`, exact: true }));
      await settled(id);
      const tiles = await page.locator('.credential-slide').evaluateAll(slides => slides.filter(slide => slide.style.display === 'block').map(slide => {
        const style = getComputedStyle(slide);
        const mount = slide.querySelector('.slide-art');
        const caption = slide.querySelector('.slide-caption');
        return { id: slide.dataset.id, front: slide.classList.contains('is-front'), frontness: slide.style.getPropertyValue('--front'),
          size: [+parseFloat(style.width).toFixed(2), +parseFloat(style.height).toFixed(2)], mount: [+parseFloat(getComputedStyle(mount).width).toFixed(2), mount.offsetHeight],
          link: slide.querySelector('.art-link').offsetWidth, art: slide.querySelector('.art-image').offsetWidth,
          caption: [getComputedStyle(caption).display, getComputedStyle(caption).overflow, caption.scrollHeight <= caption.clientHeight + 1] };
      }));
      for (const tile of tiles) {
        const label = `rest ${id}: ${tile.id} (${tile.front ? 'front' : 'side'})`;
        assert(tile.frontness === (tile.front ? '1' : '0'), `${label}: --front is ${tile.frontness}`);
        if (tile.front) {
          assert(tile.caption[0] === 'block' && tile.caption[1] === 'visible' && tile.caption[2], `${label}: caption is hidden or clipped (${tile.caption})`);
          if (restBaseline) {
            const [w, mountW, mountH, link, art] = restBaseline.front;
            assert(Math.abs(tile.size[0] - w) < 0.02 && Math.abs(tile.mount[0] - mountW) < 0.02 && tile.mount[1] === mountH && tile.link === link && tile.art === art, `${label}: front geometry ${JSON.stringify(tile)} differs from ${restBaseline.front}`);
            if (engine === 'chromium') assert(tile.size[1] === restBaseline.heights[index], `${label}: front height ${tile.size[1]} differs from ${restBaseline.heights[index]}`);
          }
        } else {
          assert(tile.caption[0] === 'none', `${label}: side caption is displayed`);
          if (restBaseline) {
            const [w, mount, link, art] = restBaseline.side;
            assert(tile.size[0] === w && tile.size[1] === w && tile.mount[0] === mount && tile.mount[1] === mount && tile.link === link && tile.art === art, `${label}: side geometry ${JSON.stringify(tile)} differs from ${restBaseline.side}`);
          }
        }
      }
      rest.push({ id, tiles: tiles.length });
    }
    await noOverflow('rest');
    assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
    const summary = results.map(({ label, from, to, frames, outgoing, incoming }) => ({ label, from, to, frames,
      outgoing: { height: [outgoing.height.start, outgoing.height.end, outgoing.height.largestShare], width: [outgoing.width.start, outgoing.width.end, outgoing.width.largestShare], caption: outgoing.caption.largestShare },
      incoming: { height: [incoming.height.start, incoming.height.end, incoming.height.largestShare], width: [incoming.width.start, incoming.width.end, incoming.width.largestShare], caption: incoming.caption.largestShare } }));
    return { width, engine, inputMode: mode, maxStepShare, baselineChecked: Boolean(restBaseline), restSelections: rest.length,
      summary, nextButtonFrames: results.find(result => result.label === 'next-button').sample, reducedMotionFrames: reduced.length, consoleErrors: errors, output };
  } finally {
    if (cdp) await cdp.detach().catch(() => {});
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
  }
}
