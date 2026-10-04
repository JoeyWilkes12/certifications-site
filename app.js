import './theme.js';

const data = JSON.parse(document.querySelector('#credential-data').textContent);
// Reel order: pin the first few and the last tile; everything else keeps its data order.
const reelOrder = { first: ['google-ml', 'aws-ai', 'anthropic-skills'], last: ['azure-fundamentals'] };
const credentials = [
  ...reelOrder.first.map(id => data.credentials.find(c => c.id === id)).filter(Boolean),
  ...data.credentials.filter(c => !reelOrder.first.includes(c.id) && !reelOrder.last.includes(c.id)),
  ...reelOrder.last.map(id => data.credentials.find(c => c.id === id)).filter(Boolean),
];
const $ = selector => document.querySelector(selector);
const showcase = $('#showcase');
const reel = $('#reel');
const slides = [...document.querySelectorAll('.credential-slide')];
const rows = [...document.querySelectorAll('.credential-row')];
const badgeSearch = $('#badge-search');
const badgeRows = [...document.querySelectorAll('.badge-row')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const dwell = 3600;      // ms the front card rests before the orbit advances
const glide = 900;       // ms for one step of the orbit
const idleResume = 6000; // ms after the last interaction before auto-rotation resumes
let filtered = credentials;
let activeId = credentials[0].id;
let category = 'all';
let progressStatus = 'all';
let query = '';
let hovered = false;
let focused = false;
let onScreen = true;
let dragging = null;
let idleTimer;
let stepTimer;
let frame;
let theta = 0;          // orbit position in card units (fractional while gliding)
let tween = null;       // { from, to, start, duration }
let radius = 460;
const stack = $('#slide-stack');
const autoStatus = $('#auto-status');
document.body.classList.add('js-enabled');
for (const slide of slides) {
  const c = credentials.find(c => c.id === slide.dataset.id);
  const img = slide.querySelector('.slide-art img');
  if (!c || !img || !c.detailPath) continue;
  const link = document.createElement('a');
  link.className = 'art-link';
  link.href = c.detailPath;
  link.setAttribute('aria-label', `Open details: ${c.title}`);
  link.draggable = false;
  img.replaceWith(link);
  // Keep reel crops inside their own viewport; source artwork stays intact elsewhere.
  const artwork = document.createElement('span');
  artwork.className = 'art-image';
  artwork.append(img);
  link.append(artwork);
  const halo = document.createElement('span');
  halo.className = 'art-halo';
  halo.setAttribute('aria-hidden', 'true');
  link.prepend(halo);
}

if (badgeSearch) {
  const badgeStatus = $('#badge-result-count');
  const badgeEmpty = $('.badge-empty');
  const totalBadges = badgeRows.length;
  const filterBadges = () => {
    const value = badgeSearch.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const row of badgeRows) {
      const matches = row.dataset.search.toLocaleLowerCase().includes(value);
      row.hidden = !matches;
      if (matches) visible += 1;
    }
    badgeStatus.textContent = value ? `${visible} of ${totalBadges} badges and certificates match.` : `${totalBadges} badges and certificates.`;
    badgeEmpty.hidden = Boolean(visible);
  };
  badgeSearch.addEventListener('input', filterBadges);
  $('#clear-badge-search').addEventListener('click', () => {
    badgeSearch.value = '';
    filterBadges();
    badgeSearch.focus({ preventScroll: true });
  });
}


/* ---------- 3D orbit ---------- */

const autoAllowed = () => !reducedMotion.matches && filtered.length > 1 && !document.hidden && onScreen;
const autoActive = () => autoAllowed() && !hovered && !focused && !dragging && !idleTimer;

let stepAngle = Math.PI / 5;
function measure() {
  const width = reel.clientWidth || 600;
  const narrow = width < 560;
  radius = Math.min(430, Math.max(200, width * (narrow ? 0.56 : 0.6)));
  stepAngle = narrow ? Math.PI / 3.75 : Math.PI / 5; // 48° on phones, 36° otherwise
}

function wrapDelta(i, count) {
  // shortest signed distance from theta to slot i on the ring
  let d = i - theta;
  d = ((d % count) + count) % count;
  if (d > count / 2) d -= count;
  return d;
}

function layout() {
  const count = filtered.length;
  if (!count) return;
  const activeIndex = ((Math.round(theta) % count) + count) % count;
  const perspective = 1300;
  const maxVisible = 2.55; // front tile + two on each side
  for (const slide of slides) {
    const i = filtered.findIndex(c => c.id === slide.dataset.id);
    if (i < 0) { slide.style.display = 'none'; continue; }
    const d = wrapDelta(i, count);
    const a = d * stepAngle;
    const cos = Math.cos(a), sin = Math.sin(a);
    const facing = Math.max(0, cos);
    if (cos < 0 || Math.abs(d) > maxVisible) { slide.style.display = 'none'; continue; }
    const x = sin * radius;
    const z = (cos - 1) * radius;
    const y = (1 - cos) * -40;
    const scale = 0.7 + 0.3 * facing ** 3;
    const opacity = Math.min(1, Math.max(0, (maxVisible - Math.abs(d)) / 0.7));
    slide.style.display = 'block';
    slide.style.transform = `translate(-50%, -50%) perspective(${perspective}px) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${(-a * 0.35).toFixed(3)}rad) scale(${scale.toFixed(3)})`;
    slide.style.opacity = opacity.toFixed(3);
    slide.style.zIndex = String(Math.round(1000 + z));
    slide.style.filter = facing > 0.9 ? 'none' : `saturate(${(0.7 + 0.3 * facing).toFixed(2)}) brightness(${(0.9 + 0.1 * facing).toFixed(2)})`;
    slide.classList.toggle('is-front', Math.abs(d) < 0.5);
  }
}

function animate(now) {
  frame = null;
  if (tween) {
    const t = Math.min(1, (now - tween.start) / tween.duration);
    const eased = 1 - Math.pow(1 - t, 3);
    theta = tween.from + (tween.to - tween.from) * eased;
    if (t >= 1) { theta = tween.to; tween = null; }
  }
  if (dragging) theta = dragging.theta;
  layout();
  if (tween || dragging) frame = window.requestAnimationFrame(animate);
  else settle();
}

function requestFrame() { if (!frame) frame = window.requestAnimationFrame(animate); }

function glideTo(target, { duration = glide } = {}) {
  if (reducedMotion.matches) { tween = null; theta = target; requestFrame(); return; }
  tween = { from: theta, to: target, start: performance.now(), duration };
  requestFrame();
}

function normalizeTheta() {
  const count = filtered.length || 1;
  theta = ((theta % count) + count) % count;
}

function settle() {
  // called when motion stops: sync active card + aria, then arm the next automatic step
  normalizeTheta();
  const count = filtered.length;
  if (!count) return;
  const index = ((Math.round(theta) % count) + count) % count;
  const id = filtered[index].id;
  if (id !== activeId) { activeId = id; syncActive({ announce: !autoActive() }); }
  armStep();
}

function armStep() {
  window.clearTimeout(stepTimer);
  updateStatus();
  if (!autoActive() || tween || dragging) return;
  stepTimer = window.setTimeout(() => { if (autoActive()) glideTo(Math.round(theta) + 1); }, dwell);
}

function updateStatus() {
  if (!autoStatus) return;
  const paused = !autoActive();
  autoStatus.textContent = filtered.length < 2 ? '' : paused ? 'Paused' : 'Auto-rotating';
  autoStatus.dataset.state = paused ? 'paused' : 'playing';
  reel.classList.toggle('is-paused', paused);
}

function touch() {
  // any human interaction: hold the orbit still, resume after a quiet period
  window.clearTimeout(stepTimer);
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => { idleTimer = null; armStep(); }, idleResume);
  updateStatus();
}

/* ---------- state + DOM sync ---------- */

function syncActive({ announce = false } = {}) {
  const index = filtered.findIndex(c => c.id === activeId);
  for (const slide of slides) {
    const active = slide.dataset.id === activeId;
    const i = filtered.findIndex(c => c.id === slide.dataset.id);
    if (i >= 0) slide.setAttribute('aria-label', `${i + 1} of ${filtered.length}: ${filtered[i].title}`);
    slide.classList.toggle('is-active', active);
    if (active) slide.removeAttribute('aria-hidden'); else slide.setAttribute('aria-hidden', 'true');
    for (const el of slide.querySelectorAll('a, button')) {
      if (active) el.removeAttribute('tabindex'); else el.setAttribute('tabindex', '-1');
    }
  }
  $('#position').textContent = filtered.length ? `${String(index + 1).padStart(2, '0')} / ${String(filtered.length).padStart(2, '0')}` : '00 / 00';
  for (const [i, button] of [...$('#pagination').children].entries()) button.setAttribute('aria-current', String(i === index));
  if (announce && index >= 0) $('#reel-announcement').textContent = `${index + 1} of ${filtered.length}: ${filtered[index].title}, ${filtered[index].issuer}.`;
}

function render() {
  stack.hidden = !filtered.length;
  $('.reel-empty').hidden = Boolean(filtered.length);
  $('#previous').disabled = $('#next').disabled = filtered.length < 2;
  $('#pagination').replaceChildren(...filtered.map(c => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Show ${c.title}`);
    button.addEventListener('click', () => select(c.id));
    return button;
  }));
  const index = Math.max(0, filtered.findIndex(c => c.id === activeId));
  theta = index;
  tween = null;
  measure();
  syncActive();
  layout();
  armStep();
}

function select(id, { manual = true } = {}) {
  const index = filtered.findIndex(c => c.id === id);
  if (index < 0) return;
  const focusedDot = $('#pagination').contains(document.activeElement);
  if (manual) touch();
  const d = wrapDelta(index, filtered.length);
  activeId = id;
  syncActive({ announce: manual });
  glideTo(theta + d);
  if (focusedDot) $('#pagination button[aria-current="true"]').focus({ preventScroll: true });
}

function step(direction) {
  if (filtered.length < 2) return;
  const current = filtered.findIndex(c => c.id === activeId);
  select(filtered[(current + direction + filtered.length) % filtered.length].id);
}

function applyFilters() {
  if (dragging) finishDrag(null, true);
  touch();
  const search = query.trim().toLocaleLowerCase();
  filtered = credentials.filter(c => (category === 'all' || (c.categories || [c.category]).includes(category)) && (progressStatus === 'all' || (c.progressStatus || 'completed') === progressStatus) && [c.title, c.issuer, ...(c.categories || [c.category]), c.kind, (c.progressStatus || '').replaceAll('-', ' '), ...c.topics].join(' ').toLocaleLowerCase().includes(search));
  if (!filtered.some(c => c.id === activeId)) activeId = filtered[0]?.id || null;
  const ids = new Set(filtered.map(c => c.id));
  for (const row of rows) row.hidden = !ids.has(row.dataset.id);
  for (const button of document.querySelectorAll('[data-category]')) button.setAttribute('aria-pressed', String(button.dataset.category === category));
  $('#result-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'record' : 'records'}`;
  $('.collection-empty').hidden = Boolean(filtered.length);
  render();
}

/* ---------- interaction ---------- */

$('#previous').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));
$('#search').addEventListener('input', event => { query = event.target.value; applyFilters(); });
$('#status-filter').addEventListener('change', event => { progressStatus = event.target.value; applyFilters(); });
for (const button of document.querySelectorAll('[data-category]')) button.addEventListener('click', () => { category = button.dataset.category; applyFilters(); });
for (const button of document.querySelectorAll('.reset-filters')) button.addEventListener('click', () => {
  category = 'all'; progressStatus = 'all'; query = ''; $('#search').value = ''; $('#status-filter').value = 'all'; applyFilters();
  if (button.closest('.collection-empty')) $('#search').focus({ preventScroll: true });
  else reel.focus({ preventScroll: true });
});
reel.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1);
  }
});

// Follow horizontal gestures from anywhere on a tile, including its badge link.
let swipeClickUntil = 0;
reel.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || dragging || !filtered.length || event.target.closest('button, input, select, textarea')) return;
  swipeClickUntil = 0;
  touch();
  tween = null;
  const front = slides.find(slide => slide.classList.contains('is-front') && slide.style.display !== 'none');
  dragging = {
    x: event.clientX, y: event.clientY, dx: 0,
    startTheta: theta, startSlot: Math.round(theta), theta,
    distance: Math.max(160, (front?.offsetWidth || 320) * 0.9),
    moved: false, pointerId: event.pointerId,
    target: event.target.closest('.credential-slide'), link: event.target.closest('a'),
  };
  requestFrame();
});
reel.addEventListener('pointermove', event => {
  if (!dragging || event.pointerId !== dragging.pointerId) return;
  const dx = event.clientX - dragging.x;
  const dy = event.clientY - dragging.y;
  if (!dragging.moved) {
    // Leave vertical scrolling and ordinary taps to the browser.
    if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy) * 1.5) return;
    dragging.moved = true;
    reel.classList.add('is-dragging');
    try { reel.setPointerCapture(event.pointerId); } catch {}
  }
  if (event.cancelable) event.preventDefault();
  dragging.dx = dx;
  const limit = filtered.length === 1 ? 0.35 : 1;
  dragging.theta = dragging.startTheta - Math.max(-limit, Math.min(limit, dx / dragging.distance));
  requestFrame();
});
const finishDrag = (event, cancelled = false) => {
  if (!dragging || (event && event.pointerId !== dragging.pointerId)) return;
  const gesture = dragging;
  dragging = null;
  reel.classList.remove('is-dragging');
  try {
    if (reel.hasPointerCapture(gesture.pointerId)) reel.releasePointerCapture(gesture.pointerId);
  } catch {}
  if (gesture.moved) {
    // A deliberate swipe steps one tile, like the arrow buttons; jitter snaps back.
    const direction = !cancelled && filtered.length > 1 && Math.abs(gesture.dx) >= 40 ? -Math.sign(gesture.dx) : 0;
    const slot = gesture.startSlot + direction;
    theta = gesture.theta;
    const index = ((slot % filtered.length) + filtered.length) % filtered.length;
    activeId = filtered[index]?.id || activeId;
    syncActive({ announce: true });
    swipeClickUntil = performance.now() + 800;
    glideTo(slot, { duration: 320 });
  } else if (!cancelled && !gesture.link && gesture.target && gesture.target.dataset.id !== activeId) {
    select(gesture.target.dataset.id);
  } else {
    glideTo(gesture.startSlot, { duration: 320 });
  }
  touch();
};
// Releases outside the reel also clear a pending mouse gesture before capture.
window.addEventListener('pointerup', event => finishDrag(event), true);
window.addEventListener('pointercancel', event => finishDrag(event, true), true);
window.addEventListener('blur', () => { if (dragging) finishDrag(null, true); });
reel.addEventListener('lostpointercapture', event => {
  // Touch starts with implicit capture on a descendant. Its transfer to the reel
  // also bubbles a lost-capture event, which must not end the new reel gesture.
  if (event.target === reel) finishDrag(event, true);
});
reel.addEventListener('click', event => {
  if (event.detail && performance.now() < swipeClickUntil) {
    event.preventDefault();
    event.stopImmediatePropagation();
    swipeClickUntil = 0;
  }
}, true);
reel.addEventListener('dragstart', event => event.preventDefault());

showcase.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; armStep(); } });
showcase.addEventListener('pointerleave', () => { hovered = false; armStep(); });
showcase.addEventListener('focusin', () => { focused = true; armStep(); });
showcase.addEventListener('focusout', event => { if (!showcase.contains(event.relatedTarget)) { focused = false; armStep(); } });
document.addEventListener('visibilitychange', armStep);
new IntersectionObserver(entries => { onScreen = entries[0].isIntersecting; armStep(); }, { threshold: 0.25 }).observe(showcase);
reducedMotion.addEventListener('change', () => { tween = null; requestFrame(); armStep(); });
window.addEventListener('resize', () => { if (dragging) finishDrag(null, true); measure(); layout(); });
document.addEventListener('keydown', event => {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
    event.preventDefault(); $('#search').focus();
  }
});

render();
