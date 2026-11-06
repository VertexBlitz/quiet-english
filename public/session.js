(async () => {
  const nav = document.querySelector('.topbar nav');
  if (nav && !nav.querySelector('a[href="/skills.html"]')) {
    const skillsLink = document.createElement('a');
    skillsLink.href = '/skills.html';
    skillsLink.textContent = document.documentElement.lang === 'en' ? 'Skills Lab' : 'Навыки';
    const practiceLink = nav.querySelector('a[href="/practice.html"]');
    if (practiceLink) practiceLink.insertAdjacentElement('afterend', skillsLink);
    else nav.appendChild(skillsLink);
  }
  const accountLink = document.querySelector('.account-link');
  if (!accountLink) return;

  let user = null;
  try {
    if (window.QEDemo) await window.QEDemo.ensure();
    const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (response.ok) user = (await response.json())?.user || null;
  } catch {}

  if (user) {
    const lang = document.documentElement.lang;
    accountLink.href = '/account.html';
    accountLink.textContent = lang === 'en' ? 'My account' : 'Мой аккаунт';
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
        location.href = '/';
      }
    });
    accountLink.parentElement?.appendChild(logout);
    return;
  }

  if (window.QEDemo?.isActive()) {
    const lang = document.documentElement.lang;
    accountLink.href = '/plan.html';
    accountLink.textContent = lang === 'en' ? 'Demo Learner' : 'Демо-профиль';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'nav-logout';
    reset.textContent = lang === 'en' ? 'Reset demo' : 'Сбросить демо';
    reset.addEventListener('click', () => {
      const confirmText = lang === 'en'
        ? 'Clear the demo profile and all progress stored in this browser?'
        : 'Очистить демо-профиль и весь прогресс, сохранённый в этом браузере?';
      if (window.confirm(confirmText)) window.QEDemo.reset();
    });
    accountLink.parentElement?.appendChild(reset);

    const header = document.querySelector('.topbar');
    if (header && !document.querySelector('.demo-notice')) {
      const notice = document.createElement('div');
      notice.className = 'demo-notice wrap';
      notice.textContent = lang === 'en'
        ? 'GUEST DEMO · Learning progress is saved only in this browser. No account or email is required.'
        : 'ГОСТЕВОЕ ДЕМО · Учебный прогресс сохраняется только в этом браузере. Аккаунт и email не нужны.';
      header.insertAdjacentElement('afterend', notice);
    }
    return;
  }

  accountLink.href = '/onboarding.html?demo=1';
  accountLink.textContent = document.documentElement.lang === 'en' ? 'Try without account' : 'Попробовать без аккаунта';
})();
