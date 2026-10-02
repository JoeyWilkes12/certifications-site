document.body.classList.add('js-enabled');
const themeButton = document.querySelector('#theme-toggle');

function reflectTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#10182c' : '#244bb5';
}

themeButton.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('credential-theme', theme); } catch { /* Selection still works without storage. */ }
  reflectTheme();
});
reflectTheme();
