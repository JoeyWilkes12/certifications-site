// Playwright CLI callback for localhost. Use desktop Chromium, iPhone/WebKit,
// and a complete Chromium touch profile (for native CDP gesture coverage).
async (page) => {
  const origin = new URL(page.url()).origin;
  if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) {
    throw new Error('Run this regression check against localhost.');
  }
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const width = page.viewportSize().width;
  const engine = page.context().browser().browserType().name();
  const errors = [];
  const onPageError = error => errors.push(error.message);
  const onConsole = message => { if (message.type() === 'error') errors.push(message.text()); };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  let cdp;
  let mode;
  const gestures = [];
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const active = () => page.locator('.credential-slide.is-active').getAttribute('data-id');
  const settled = id => page.waitForFunction(id => {
    const slide = document.querySelector(`.credential-slide[data-id="${id}"]`);
    return slide?.classList.contains('is-active') && slide.style.display === 'block'
      && /translate3d\(-?0(?:\.0+)?px,\s*-?0(?:\.0+)?px,\s*-?0(?:\.0+)?px\)/.test(slide.style.transform)
      && !document.querySelector('#reel').classList.contains('is-dragging');
  }, id);
  const centerX = id => page.locator(`.credential-slide[data-id="${id}"]`).evaluate(slide => {
    const box = slide.getBoundingClientRect();
    return box.left + box.width / 2;
  });
  const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
  const galleryURL = label => assert(new URL(page.url()).pathname === '/', `${label}: gesture accidentally followed an artwork link (${page.url()})`);

  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert((await page.goto(origin))?.ok(), 'Local gallery did not return a successful response');
    const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    if (touch && engine === 'chromium') cdp = await page.context().newCDPSession(page);
    mode = cdp ? 'native-chromium-touch' : touch ? 'synthetic-webkit-pointer' : 'native-mouse';
    const output = `output/playwright/reel-swipe/${width}-${mode}`;
    const activate = locator => touch ? locator.tap() : locator.click();
    const records = await page.locator('#credential-data').evaluate(node => JSON.parse(node.textContent).credentials);
    const recordById = new Map(records.map(record => [record.id, record]));
    const order = async () => {
      const labels = await page.locator('#pagination button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label').slice(5)));
      return labels.map(title => {
        const record = records.find(record => record.title === title);
        assert(record, `Pagination title has no credential: ${title}`);
        return record.id;
      });
    };
    const all = await order();
    assert(all.length === 17, 'Expected all 17 credentials before gesture checks');
    const show = async id => {
      await activate(page.getByRole('button', { name: `Show ${recordById.get(id).title}`, exact: true }));
      await settled(id);
    };
    const installEvents = () => page.evaluate(() => {
      window.__swipeEvents = [];
      const reel = document.querySelector('#reel');
      const types = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture', 'click'];
      const listener = event => window.__swipeEvents.push({
        type: event.type, trusted: event.isTrusted, pointerType: event.pointerType,
        pointerId: event.pointerId, target: event.target.tagName,
        artwork: Boolean(event.target.closest('.art-link')), reel: event.target === reel,
      });
      for (const type of types) reel.addEventListener(type, listener, true);
      window.__stopSwipeEvents = () => { for (const type of types) reel.removeEventListener(type, listener, true); };
    });
    await installEvents();

    const gesture = async ({ label, dx, dy = 0, target = '.art-link', expected, cancel = false, motion = false, scroll = false, capture = false }) => {
      const before = await active();
      await settled(before);
      const startSlide = page.locator(`.credential-slide[data-id="${before}"]`);
      await startSlide.locator('.art-image img').evaluate(img => img.decode());
      const locator = startSlide.locator(target);
      await locator.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await frames();
      const box = await locator.boundingBox();
      assert(box && box.width && box.height, `${label}: gesture target is not visible`);
      const x = box.x + box.width / 2;
      const y = Math.min(page.viewportSize().height - 20, Math.max(20, box.y + box.height / 2));
      const initialX = await centerX(before);
      const initialScroll = await page.evaluate(() => scrollY);
      await page.evaluate(({ x, y }) => {
        window.__swipeEvents = [];
        window.__swipeTarget = document.elementFromPoint(x, y);
      }, { x, y });
      const synthetic = (type, point, buttons) => page.evaluate(({ type, point, buttons }) => {
        window.__swipeTarget.dispatchEvent(new PointerEvent(type, {
          bubbles: true, cancelable: true, pointerId: 101, pointerType: 'touch',
          isPrimary: true, button: 0, buttons, detail: type === 'click' ? 1 : 0, clientX: point.x, clientY: point.y,
        }));
      }, { type, point, buttons });
      const move = async (px, py) => {
        if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: px, y: py, id: 1, radiusX: 1, radiusY: 1, force: 1 }] });
        else if (touch) await synthetic('pointermove', { x: px, y: py }, 1);
        else await page.mouse.move(px, py);
        await page.waitForTimeout(35);
      };
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }] });
      else if (touch) await synthetic('pointerdown', { x, y }, 1);
      else { await page.mouse.move(x, y); await page.mouse.down(); }
      const down = await page.evaluate(() => window.__swipeEvents.find(event => event.type === 'pointerdown'));
      assert(down, `${label}: no pointerdown reached the reel`);
      if (target === '.art-link') assert(down.artwork, `${label}: gesture did not start on artwork`);
      if (cdp) assert(down.trusted && down.pointerType === 'touch', `${label}: expected trusted native touch input`);
      await move(x + dx / 2, y + dy / 2);
      await frames();
      const movement = (await centerX(before)) - initialX;
      if (motion) {
        assert(Math.abs(movement) > 1 && Math.sign(movement) === Math.sign(dx), `${label}: starting card did not follow the finger (${movement.toFixed(2)}px)`);
        assert(await page.locator('#reel').evaluate(reel => reel.classList.contains('is-dragging')), `${label}: drag ended during pointer-capture transfer`);
        if (capture) await page.screenshot({ path: `${output}/${label}-during.png`, scale: 'css' });
      }
      await move(x + dx, y + dy);
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
      else if (touch) {
        await synthetic(cancel ? 'pointercancel' : 'pointerup', { x: x + dx, y: y + dy }, 0);
        // WebKit's dispatchEvent fallback has no browser-generated compatibility click.
        // Exercise its click guard even when filtering leaves only one card.
        if (!cancel && !dy && Math.abs(dx) >= 8 && target === '.art-link') {
          await synthetic('click', { x: x + dx, y: y + dy }, 0);
        }
      } else {
        if (cancel) await page.locator('#reel').evaluate(reel => reel.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: window.__swipeEvents.find(event => event.type === 'pointerdown').pointerId, pointerType: 'mouse', isPrimary: true })));
        await page.mouse.up();
      }
      await page.waitForTimeout(80);
      galleryURL(label);
      await settled(expected || before);
      assert(await active() === (expected || before), `${label}: wrong selected credential`);
      const scrollDelta = (await page.evaluate(() => scrollY)) - initialScroll;
      if (scroll && cdp) assert(Math.abs(scrollDelta) > 10, `${label}: native vertical scrolling was blocked`);
      await noOverflow();
      const events = await page.evaluate(() => window.__swipeEvents);
      if (cancel && cdp) assert(events.some(event => event.type === 'pointercancel' && event.trusted), `${label}: native touchCancel did not reach the page`);
      gestures.push({ label, from: before, to: await active(), movement: +movement.toFixed(2), scrollDelta: +scrollDelta.toFixed(2), cancellation: cancel ? cdp ? 'native-touchCancel' : 'synthetic-pointercancel' : undefined,
        captureEvents: events.filter(event => /pointercapture$/.test(event.type)), trustedTouch: Boolean(down.trusted && down.pointerType === 'touch') });
      if (capture) await page.screenshot({ path: `${output}/${label}-after.png`, scale: 'css' });
    };

    await show(all[0]);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await gesture({ label: 'artwork-left-50', dx: -50, expected: all[1], motion: true, capture: true });
    await gesture({ label: 'artwork-right-50', dx: 50, expected: all[0], motion: true });
    await gesture({ label: 'long-swipe-one-tile', dx: -Math.min(520, width * 0.44), expected: all[1], motion: true });

    await show(all[7]);
    assert(await page.locator(`.credential-slide[data-id="${all[0]}"]`).evaluate(slide => getComputedStyle(slide).display === 'none'), 'Hidden-first-card case did not hide the first card');
    await gesture({ label: 'hidden-first-card-left-50', dx: -50, expected: all[8], motion: true });
    await gesture({ label: 'caption-right-50', dx: 50, target: '.slide-caption', expected: all[7], motion: true });
    await gesture({ label: 'short-artwork-snap-back', dx: -20, expected: all[7] });
    await gesture({ label: 'caption-jitter', dx: 5, target: '.slide-caption', expected: all[7] });
    await gesture({ label: 'cancel-snap-back', dx: -60, expected: all[7], cancel: true, motion: true });
    await gesture({ label: 'vertical-scroll', dx: 8, dy: -120, expected: all[7], scroll: true });

    if (!touch) {
      // A pending vertical mouse gesture has no capture. Releasing outside the
      // reel must clear it so the next valid swipe can start.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await frames();
      const caption = await page.locator(`.credential-slide[data-id="${all[7]}"] .slide-caption`).boundingBox();
      const x = caption.x + caption.width / 2;
      const y = caption.y + caption.height / 2;
      assert(await page.evaluate(x => !document.elementFromPoint(x, 10)?.closest('#reel'), x), 'Outside-release endpoint is still inside the reel');
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, 10);
      await page.mouse.up();
      await settled(all[7]);
      await gesture({ label: 'swipe-after-outside-release', dx: -50, expected: all[8], motion: true });
    }

    await show(all[0]);
    await gesture({ label: 'wrap-first-to-last', dx: 50, expected: all.at(-1) });
    await gesture({ label: 'wrap-last-to-first', dx: -50, expected: all[0] });

    await page.locator('#search').fill(recordById.get('azure-fundamentals').title);
    assert((await order()).length === 1, 'Single-result filter did not produce one tile');
    assert(await page.locator('#previous').isDisabled() && await page.locator('#next').isDisabled(), 'Single tile kept step buttons enabled');
    await gesture({ label: 'single-result-swipe', dx: -50, expected: 'azure-fundamentals' });
    await page.locator('#search').fill('__no_matching_credential__');
    assert((await order()).length === 0 && await page.locator('#position').textContent() === '00 / 00', 'Zero-result filter did not clear the reel');
    assert(await page.locator('.reel-empty').isVisible() && await page.locator('#slide-stack').isHidden(), 'Zero-result reel did not expose its empty state');
    assert(await page.locator('#previous').isDisabled() && await page.locator('#next').isDisabled(), 'Empty reel kept step buttons enabled');
    await page.locator('#reel').focus();
    await page.keyboard.press('ArrowRight');
    assert(await page.locator('#position').textContent() === '00 / 00', 'Keyboard step broke the empty reel');
    await page.locator('#search').fill('FinOps');
    const filtered = await order();
    assert(filtered.length > 1 && filtered.length < all.length, 'Multiple-result filter did not narrow the reel');
    await show(filtered[0]);
    await gesture({ label: 'multiple-result-swipe', dx: -50, expected: filtered[1] });
    await page.locator('#search').fill('');
    assert((await order()).length === 17, 'Clearing the filter did not restore all records');
    await show(all[0]);
    await activate(page.locator('#next'));
    await settled(all[1]);
    await activate(page.locator('#previous'));
    await settled(all[0]);
    await page.locator('#reel').focus();
    await page.keyboard.press('ArrowRight');
    await settled(all[1]);
    await page.keyboard.press('ArrowLeft');
    await settled(all[0]);

    // A fresh reduced-motion page proves autoplay is paused independently of the
    // six-second interaction timer, then proves manual swipes still operate.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(origin);
    await installEvents();
    await settled(all[0]);
    assert(await page.locator('#auto-status').textContent() === 'Paused', 'Reduced motion did not pause automatic rotation');
    await page.waitForTimeout(3900);
    assert(await active() === all[0], 'Reduced motion allowed an automatic step');
    await gesture({ label: 'reduced-motion-left-50', dx: -50, expected: all[1], capture: true });
    assert(await page.locator('.credential-slide.is-active .art-halo').evaluate(halo => getComputedStyle(halo).animationName === 'none'), 'Reduced motion still animates the artwork halo');

    // A plain tap after drag/cancel coverage must retain its original destination.
    await show(all[0]);
    await activate(page.locator(`.credential-slide[data-id="${all[0]}"] .art-link`));
    await page.waitForURL(new URL(recordById.get(all[0]).detailPath, origin + '/').href);
    assert(await page.locator('.detail-artwork img').count() === 1, 'Artwork tap opened the wrong detail page');
    assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
    return { width, engine, touch, inputMode: mode, syntheticLimitations: mode === 'synthetic-webkit-pointer' ? 'Pointer dispatch checks application logic; native WebKit swipe arbitration and scrolling are not covered.' : undefined,
      gestures, nativeVerticalScrollVerified: Boolean(cdp), filtersChecked: [0, 1, filtered.length], buttonsAndKeyboardChecked: true,
      plainArtworkTapChecked: true, outsideReleaseChecked: !touch, reducedMotionChecked: true, consoleErrors: errors, output };
  } finally {
    await page.evaluate(() => window.__stopSwipeEvents?.()).catch(() => {});
    if (cdp) await cdp.detach();
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
  }
}
