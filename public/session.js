const accountLink = document.querySelector('.account-link');
if (accountLink) {
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(async response => response.ok ? response.json() : null)
    .then(data => {
      if (!data?.user) return;
      const lang = document.documentElement.lang;
      accountLink.href = '/account.html';
      accountLink.textContent = lang === 'en' ? 'My plan' : 'Мой план';
      const logout = document.createElement('button');
      logout.type = 'button';
      logout.className = 'nav-logout';
      logout.textContent = lang === 'en' ? 'Sign out' : 'Выйти';
      logout.addEventListener('click', async () => {
        logout.disabled = true;
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
          });
        } finally {
          location.href = '/login.html';
        }
      });
      accountLink.parentElement?.appendChild(logout);
    })
    .catch(() => {});
}
