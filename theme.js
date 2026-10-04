document.body.classList.add('js-enabled');
const themeButton = document.querySelector('#theme-toggle');

function reflectTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#04101f' : '#f5f0e7';
}

themeButton.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('credential-theme', theme); } catch { /* Selection still works without storage. */ }
  reflectTheme();
});
reflectTheme();
