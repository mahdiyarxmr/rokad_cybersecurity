(function () {
  try {
    var theme = localStorage.getItem('rokad-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (!theme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (err) {
    // Theme is cosmetic; ignore storage failures.
  }
})();
