(() => {
  const card = document.querySelector('[data-pwa-install-card]');
  if (!card) return;

  const message = card.querySelector('[data-pwa-install-message]');
  const button = card.querySelector('[data-pwa-install-button]');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (isStandalone) return;

  const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  let deferredPrompt = null;
  const t = (ru, en) => document.documentElement.lang === 'en' ? en : ru;

  function renderInstallPrompt() {
    if (isAppleMobile) {
      card.hidden = false;
      if (message) {
        message.textContent = t(
          'На iPhone: нажми «Поделиться» в Safari, затем «На экран Домой».',
          'On iPhone: tap Share in Safari, then choose Add to Home Screen.'
        );
      }
      if (button) button.hidden = true;
      return;
    }

    if (deferredPrompt) {
      card.hidden = false;
      if (message) {
        message.textContent = t(
          'Установи Quiet English на устройство для быстрого доступа с главного экрана.',
          'Install Quiet English for quick access from your home screen.'
        );
      }
      if (button) {
        button.hidden = false;
        button.textContent = t('Установить приложение', 'Install app');
      }
    }
  }

  window.addEventListener('quietenglish:languagechange', renderInstallPrompt);

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    renderInstallPrompt();
  });

  button?.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    button.disabled = true;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') card.hidden = true;
      deferredPrompt = null;
    } catch (error) {
      console.warn('PWA installation prompt failed:', error?.message || 'unknown error');
    } finally {
      button.disabled = false;
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    card.hidden = true;
  });

  renderInstallPrompt();
})();
