const accountLink = document.querySelector('.account-link');
if (accountLink) {
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(async response => response.ok ? response.json() : null)
    .then(data => {
      if (!data?.user) return;
      accountLink.href = '/plan.html';
      accountLink.textContent = document.documentElement.lang === 'en' ? 'My plan' : 'Мой план';
    })
    .catch(() => {});
}
