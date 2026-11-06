(() => {
  const key = 'qe.lang';
  const buttons = [...document.querySelectorAll('[data-set-lang]')];
  const supported = ['ru','en'];

  function applyLanguage(language) {
    const lang = supported.includes(language) ? language : 'ru';
    document.documentElement.lang = lang;
    try { localStorage.setItem(key, lang); } catch {}
    document.querySelectorAll('[data-ru][data-en]').forEach(element => {
      const value = element.getAttribute('data-' + lang);
      if (value == null) return;
      const elementChildren = [...element.childNodes].filter(node => node.nodeType === Node.ELEMENT_NODE);
      if (elementChildren.length) {
        const textNode = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.nodeValue = value;
      } else {
        element.textContent = value;
      }
    });
    buttons.forEach(button => {
      const active = button.dataset.setLang === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  let preferred = 'ru';
  try { preferred = localStorage.getItem(key) || 'ru'; } catch {}
  applyLanguage(preferred);
  buttons.forEach(button => button.addEventListener('click', () => applyLanguage(button.dataset.setLang)));
})();
