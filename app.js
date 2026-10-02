import './theme.js';

const data = JSON.parse(document.querySelector('#credential-data').textContent);
const credentials = data.credentials;
const $ = selector => document.querySelector(selector);
const showcase = $('#showcase');
const reel = $('#reel');
const slides = [...document.querySelectorAll('.credential-slide')];
const rows = [...document.querySelectorAll('.credential-row')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const interval = 7000;
let filtered = credentials;
let activeId = credentials[0].id;
let category = 'all';
let progressStatus = 'all';
let query = '';
let playing = !reducedMotion.matches;
let timer;
let hovered = false;
let onScreen = true;
let startPointer;
document.body.classList.add('js-enabled');

function schedule() {
  window.clearInterval(timer);
  if (playing && filtered.length > 1 && !document.hidden && !hovered && onScreen) {
    timer = window.setInterval(() => step(1, false), interval);
  }
}

function setPlaying(value) {
  playing = value;
  const button = $('#play-toggle');
  button.setAttribute('aria-label', playing ? 'Pause automatic rotation' : 'Play automatic rotation');
  button.querySelector('span').textContent = playing ? 'Pause rotation' : 'Play rotation';
  button.querySelector('use').setAttribute('href', `assets/icons.svg#${playing ? 'pause' : 'play'}`);
  schedule();
}

function render({ announce = false, animate = false } = {}) {
  const index = filtered.findIndex(c => c.id === activeId);
  const nextId = filtered.length > 1 ? filtered[(index + 1) % filtered.length]?.id : null;
  for (const slide of slides) {
    const active = slide.dataset.id === activeId;
    slide.classList.toggle('is-active', active);
    slide.classList.toggle('is-next', !active && slide.dataset.id === nextId);
    slide.classList.remove('is-moving');
    slide.inert = !active;
    if (active) {
      slide.removeAttribute('aria-hidden');
      if (animate && !reducedMotion.matches) {
        void slide.offsetWidth;
        slide.classList.add('is-moving');
      }
    } else slide.setAttribute('aria-hidden', 'true');
  }
  $('#slide-stack').hidden = !filtered.length;
  $('.reel-empty').hidden = Boolean(filtered.length);
  $('#position').textContent = filtered.length ? `${String(index + 1).padStart(2, '0')} / ${String(filtered.length).padStart(2, '0')}` : '00 / 00';
  $('#previous').disabled = $('#next').disabled = filtered.length < 2;
  $('#play-toggle').disabled = filtered.length < 2;
  $('#pagination').replaceChildren(...filtered.map((c, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Show ${c.title}`);
    button.setAttribute('aria-current', String(c.id === activeId));
    button.addEventListener('click', () => select(c.id));
    return button;
  }));
  if (announce && index >= 0) $('#reel-announcement').textContent = `${index + 1} of ${filtered.length}: ${filtered[index].title}, ${filtered[index].issuer}.`;
  schedule();
}

function select(id) {
  if (!filtered.some(c => c.id === id)) return;
  const focusedDot = $('#pagination').contains(document.activeElement);
  setPlaying(false);
  activeId = id;
  render({ announce: true, animate: true });
  if (focusedDot) $('#pagination button[aria-current="true"]').focus({ preventScroll: true });
}

function step(direction, manual = true) {
  if (filtered.length < 2) return;
  const current = filtered.findIndex(c => c.id === activeId);
  const id = filtered[(current + direction + filtered.length) % filtered.length].id;
  if (manual) select(id);
  else { activeId = id; render({ animate: true }); }
}

function applyFilters() {
  setPlaying(false);
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

$('#previous').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));
$('#play-toggle').addEventListener('click', () => setPlaying(!playing));
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
reel.addEventListener('pointerdown', event => { startPointer = { x: event.clientX, y: event.clientY }; });
reel.addEventListener('pointerup', event => {
  if (!startPointer) return;
  const dx = event.clientX - startPointer.x;
  const dy = event.clientY - startPointer.y;
  startPointer = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) { event.preventDefault(); step(dx < 0 ? 1 : -1); }
});
reel.addEventListener('pointercancel', () => { startPointer = null; });
showcase.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
showcase.addEventListener('pointerleave', () => { hovered = false; schedule(); });
showcase.addEventListener('focusin', event => { if (!event.target.closest('#play-toggle')) setPlaying(false); });
document.addEventListener('visibilitychange', schedule);
new IntersectionObserver(entries => { onScreen = entries[0].isIntersecting; schedule(); }, { threshold: 0.25 }).observe(showcase);
reducedMotion.addEventListener('change', event => { if (event.matches) setPlaying(false); });

function setDisplay(value) {
  document.body.classList.toggle('display-mode', value);
  const button = $('#display-toggle');
  button.setAttribute('aria-pressed', String(value));
  button.querySelector('span').textContent = value ? 'Exit display' : 'Display mode';
  button.querySelector('use').setAttribute('href', `assets/icons.svg#${value ? 'close' : 'expand'}`);
  if (value) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setPlaying(!reducedMotion.matches);
  }
}
$('#display-toggle').addEventListener('click', () => setDisplay(!document.body.classList.contains('display-mode')));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('display-mode')) {
    setDisplay(false); $('#display-toggle').focus();
  }
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !document.body.classList.contains('display-mode') && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
    event.preventDefault(); $('#search').focus();
  }
});
setPlaying(playing);
render();
