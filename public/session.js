(() => {
  const header = document.querySelector('.topbar');
  if (!header || window.__quietEnglishNavigationInstalled) return;
  window.__quietEnglishNavigationInstalled = true;

  const labels = {
    plan: ['План', 'Plan'],
    practice: ['Практика', 'Practice'],
    speaking: ['Говорение', 'Speaking'],
    progress: ['Прогресс', 'Progress'],
    knowledge: ['База знаний', 'Knowledge base'],
    writing: ['Письмо', 'Writing Lab'],
    listening: ['Аудирование', 'Listening'],
    review: ['Повторение', 'Review'],
    dictionary: ['Словарь', 'Dictionary'],
    calendar: ['Календарь', 'Calendar'],
    coach: ['AI-наставник', 'AI Coach'],
    map: ['Карта знаний', 'Knowledge map'],
    library: ['Библиотека', 'Library'],
    offline: ['Офлайн-библиотека', 'Offline library'],
    premium: ['Premium', 'Premium'],
    tutor: ['AI-репетитор', 'AI tutor'],
    more: ['Ещё', 'More'],
    login: ['Войти', 'Sign in'],
    account: ['Аккаунт', 'Account'],
    logout: ['Выйти', 'Sign out']
  };

  // Keep the most-used destinations visible. Everything else lives in one
  // predictable menu on desktop and mobile.
  const primary = [
    ['plan', '/plan.html'],
    ['practice', '/practice.html'],
    ['speaking', '/pronunciation.html'],
    ['progress', '/progress.html']
  ];
  const secondary = [
    ['listening', '/listening.html'],
    ['knowledge', '/knowledge.html'],
    ['writing', '/writing.html'],
    ['review', '/review.html'],
    ['dictionary', '/dictionary.html'],
    ['calendar', '/calendar.html'],
    ['coach', '/studio.html'],
    ['map', '/knowledge-map.html'],
    ['library', '/library.html'],
    ['offline', '/offline.html'],
    ['premium', '/subscription.html'],
    ['tutor', '/tutor.html']
  ];

  const currentPath = location.pathname === '/index.html' ? '/' : location.pathname;
  const langKey = 'qe.lang';
  let lang = 'ru';

  try {
    lang = localStorage.getItem(langKey) === 'en' ? 'en' : 'ru';
  } catch {}

  const translated = key => labels[key][lang === 'en' ? 1 : 0];
  const isCurrent = href => currentPath === href || currentPath === href.replace(/\.html$/, '');
  const createLink = ([key, href]) => {
    const link = document.createElement('a');
    link.href = href;
    link.dataset.ru = labels[key][0];
    link.dataset.en = labels[key][1];
    link.textContent = translated(key);
    if (isCurrent(href)) {
      link.classList.add('is-current');
      link.setAttribute('aria-current', 'page');
    }
    return link;
  };

  let nav = header.querySelector('nav');
  if (!nav) {
    nav = document.createElement('nav');
    header.append(nav);
  }
  nav.className = 'site-nav';
  nav.setAttribute('aria-label', lang === 'en' ? 'Main navigation' : 'Основная навигация');
  nav.replaceChildren(...primary.map(createLink));

  const more = document.createElement('details');
  more.className = 'site-nav-more';
  if (secondary.some(([, href]) => isCurrent(href))) more.classList.add('is-current');

  const summary = document.createElement('summary');
  summary.dataset.ru = labels.more[0];
  summary.dataset.en = labels.more[1];
  summary.textContent = translated('more');
  summary.setAttribute('aria-label', lang === 'en' ? 'More sections' : 'Другие разделы');
  more.append(summary);

  const menu = document.createElement('div');
  menu.className = 'site-nav-menu';
  menu.setAttribute('aria-label', lang === 'en' ? 'Additional sections' : 'Дополнительные разделы');
  secondary.forEach(item => menu.append(createLink(item)));
  more.append(menu);
  nav.append(more);
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) more.open = false;
  });

  let controls = header.querySelector('.language-switch');
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'language-switch';
    header.append(controls);
  }
  controls.replaceChildren();

  ['ru', 'en'].forEach(code => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = code.toUpperCase();
    button.setAttribute('aria-label', code === 'ru' ? 'Русский язык' : 'English language');
    button.setAttribute('aria-pressed', String(code === lang));
    button.classList.toggle('active', code === lang);
    button.addEventListener('click', () => applyLanguage(code));
    controls.append(button);
  });

  const account = document.createElement('a');
  account.className = 'account-link';
  account.href = '/login.html';
  account.dataset.ru = labels.login[0];
  account.dataset.en = labels.login[1];
  account.textContent = translated('login');
  controls.append(account);

  function applyTranslations() {
    document.querySelectorAll('[data-ru][data-en]').forEach(element => {
      const value = element.getAttribute('data-' + lang);
      if (value == null) return;
      const directTextNodes = [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE);
      if (element.children.length && directTextNodes.length) {
        const textNode = directTextNodes.find(node => node.nodeValue.trim().length) || directTextNodes[0];
        if (textNode) textNode.nodeValue = value;
      } else {
        element.textContent = value;
      }
    });

    document.querySelectorAll('[data-placeholder-ru][data-placeholder-en]').forEach(element => {
      element.setAttribute('placeholder', element.getAttribute('data-placeholder-' + lang));
    });
    document.querySelectorAll('[data-aria-label-ru][data-aria-label-en]').forEach(element => {
      element.setAttribute('aria-label', element.getAttribute('data-aria-label-' + lang));
    });
    document.querySelectorAll('[data-title-ru][data-title-en]').forEach(element => {
      element.setAttribute('title', element.getAttribute('data-title-' + lang));
    });

    const pageTitle = document.documentElement.getAttribute('data-title-' + lang);
    if (pageTitle) document.title = pageTitle;
  }

  function applyLanguage(code) {
    lang = code === 'en' ? 'en' : 'ru';
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(langKey, lang);
    } catch {}

    applyTranslations();
    nav.setAttribute('aria-label', lang === 'en' ? 'Main navigation' : 'Основная навигация');
    summary.textContent = translated('more');
    summary.setAttribute('aria-label', lang === 'en' ? 'More sections' : 'Другие разделы');
    menu.setAttribute('aria-label', lang === 'en' ? 'Additional sections' : 'Дополнительные разделы');

    controls.querySelectorAll('button').forEach(button => {
      const active = button.textContent.toLowerCase() === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    window.dispatchEvent(new CustomEvent('quietenglish:languagechange', {
      detail: { language: lang }
    }));
  }

  applyTranslations();
  window.QuietEnglishLanguage = {
    get: () => lang,
    t: (ru, en) => lang === 'en' ? en : ru,
    apply: applyLanguage
  };

  fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
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
      logout.addEventListener('click', async () => {
        logout.disabled = true;
        try {
          const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
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
