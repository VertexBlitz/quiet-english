(() => {
  const key = 'qe.lang';
  const supported = ['ru', 'en'];

  function applyLanguage(language, options = {}) {
    const lang = supported.includes(language) ? language : 'ru';
    document.documentElement.lang = lang;

    if (options.persist !== false) {
      try { localStorage.setItem(key, lang); } catch {}
    }

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

    document.querySelectorAll('[data-set-lang]').forEach(button => {
      const active = button.dataset.setLang === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    window.dispatchEvent(new CustomEvent('quietenglish:languagechange', {
      detail: { language: lang }
    }));
  }

  let preferred = 'ru';
  try {
    preferred = localStorage.getItem(key) || 'ru';
  } catch {}
  applyLanguage(preferred, { persist: false });

  document.querySelectorAll('[data-set-lang]').forEach(button => {
    button.addEventListener('click', () => applyLanguage(button.dataset.setLang));
  });

  window.QuietEnglishLanguage = {
    get: () => document.documentElement.lang === 'en' ? 'en' : 'ru',
    t: (ru, en) => document.documentElement.lang === 'en' ? en : ru,
    apply: applyLanguage
  };
})();
