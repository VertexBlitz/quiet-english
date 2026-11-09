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

  if (isAppleMobile) {
    card.hidden = false;
    if (message) {
      message.textContent = 'На iPhone: нажми «Поделиться» в Safari, затем «На экран Домой».';
    }
    if (button) button.hidden = true;
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    card.hidden = false;

    if (message) {
      message.textContent = 'Установи Quiet English на устройство для быстрого доступа с главного экрана.';
    }
    if (button) button.hidden = false;
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
})();
