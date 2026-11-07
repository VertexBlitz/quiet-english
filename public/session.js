(() => {
  const header = document.querySelector('.topbar');
  if (!header || window.__quietEnglishNavigationInstalled) return;
  window.__quietEnglishNavigationInstalled = true;

  const labels = {
    plan: ['План', 'Plan'], practice: ['Практика', 'Practice'],
    knowledge: ['База знаний', 'Knowledge'], writing: ['Writing Lab', 'Writing Lab'],
    listening: ['Аудирование', 'Listening'], speaking: ['Произношение', 'Speaking'],
    progress: ['Прогресс', 'Progress'], review: ['Повторение', 'Review'],
    dictionary: ['Словарь', 'Dictionary'], calendar: ['Календарь', 'Calendar'],
    coach: ['AI Coach', 'AI Coach'], map: ['Карта знаний', 'Knowledge map'],
    library: ['Библиотека', 'Library'], offline: ['Офлайн-библиотека', 'Offline library'],
    premium: ['Premium', 'Premium'], more: ['Ещё', 'More'],
    login: ['Войти', 'Sign in'], account: ['Аккаунт', 'Account'], logout: ['Выйти', 'Sign out']
  };
  const primary = [
    ['plan','/plan.html'],['practice','/practice.html'],['knowledge','/knowledge.html'],
    ['writing','/writing.html'],['listening','/listening.html'],
    ['speaking','/pronunciation.html'],['progress','/progress.html']
  ];
  const secondary = [
    ['review','/review.html'],['dictionary','/dictionary.html'],['calendar','/calendar.html'],
    ['coach','/studio.html'],['map','/knowledge-map.html'],['library','/library.html'],
    ['offline','/offline.html'],['premium','/subscription.html']
  ];
  const currentPath = location.pathname;
  const langKey = 'qe.lang';
  let lang = 'ru';
  try { lang = localStorage.getItem(langKey) === 'en' ? 'en' : 'ru'; } catch {}

  const translated = (key) => labels[key][lang === 'en' ? 1 : 0];
  const createLink = ([key, href]) => {
    const link = document.createElement('a');
    link.href = href;
    link.dataset.ru = labels[key][0];
    link.dataset.en = labels[key][1];
    link.textContent = translated(key);
    if (currentPath === href) {
      link.classList.add('is-current');
      link.setAttribute('aria-current','page');
    }
    return link;
  };

  let nav = header.querySelector('nav');
  if (!nav) { nav = document.createElement('nav'); header.append(nav); }
  nav.className = 'site-nav';
  nav.setAttribute('aria-label', lang === 'en' ? 'Main navigation' : 'Основная навигация');
  nav.replaceChildren(...primary.map(createLink));

  const more = document.createElement('details');
  more.className = 'site-nav-more';
  if (secondary.some(([,href]) => href === currentPath)) more.classList.add('is-current');
  const summary = document.createElement('summary');
  summary.dataset.ru = labels.more[0];
  summary.dataset.en = labels.more[1];
  summary.textContent = translated('more');
  more.append(summary);
  const menu = document.createElement('div');
  menu.className = 'site-nav-menu';
  secondary.forEach(item => menu.append(createLink(item)));
  more.append(menu);
  nav.append(more);
  nav.addEventListener('click', event => { if (event.target.closest('a')) more.open = false; });

  let controls = header.querySelector('.language-switch');
  if (!controls) { controls = document.createElement('div'); controls.className='language-switch'; header.append(controls); }
  controls.replaceChildren();
  ['ru','en'].forEach(code => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = code.toUpperCase();
    button.classList.toggle('active', code === lang);
    button.setAttribute('aria-pressed',String(code === lang));
    button.addEventListener('click',() => applyLanguage(code));
    controls.append(button);
  });
  const account = document.createElement('a');
  account.className = 'account-link';
  account.href = '/login.html';
  account.dataset.ru = labels.login[0];
  account.dataset.en = labels.login[1];
  account.textContent = translated('login');
  controls.append(account);

  function applyLanguage(code) {
    lang = code === 'en' ? 'en' : 'ru';
    document.documentElement.lang = lang;
    try { localStorage.setItem(langKey,lang); } catch {}
    document.querySelectorAll('[data-ru][data-en]').forEach(element => {
      const value = element.getAttribute('data-' + lang);
      if (value == null) return;
      const children = [...element.childNodes].filter(node => node.nodeType === Node.ELEMENT_NODE);
      if (children.length) {
        const text = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
        if (text) text.nodeValue = value;
      } else element.textContent = value;
    });
    nav.setAttribute('aria-label',lang === 'en' ? 'Main navigation' : 'Основная навигация');
    controls.querySelectorAll('button').forEach(button => {
      const active = button.textContent.toLowerCase() === lang;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    summary.textContent = translated('more');
  }

  fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'})
    .then(async response => response.ok ? response.json() : null)
    .then(data => {
      if (!data?.user) return;
      account.href = '/account.html';
      account.dataset.ru = labels.account[0];
      account.dataset.en = labels.account[1];
      account.textContent = translated('account');
      const logout = document.createElement('button');
      logout.type = 'button';
      logout.className = 'nav-logout';
      logout.dataset.ru = labels.logout[0];
      logout.dataset.en = labels.logout[1];
      logout.textContent = translated('logout');
      logout.addEventListener('click',async () => {
        logout.disabled = true;
        try {
          const response = await fetch('/api/auth/logout',{
            method:'POST',credentials:'same-origin',
            headers:{'Content-Type':'application/json'},body:'{}'
          });
          if (!response.ok) throw new Error('Logout failed');
        } catch {
          logout.disabled = false;
          return;
        }
        location.href = '/login.html';
      });
      controls.append(logout);
    })
    .catch(() => {});
})();
