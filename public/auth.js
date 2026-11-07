const authForm = document.querySelector('[data-auth-form]');
const authStatus = document.querySelector('[data-auth-status]');

async function authRequest(path, body) {
  const response = await fetch('/api/auth' + path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос.');
  return data;
}

function showAuthMessage(message, isError = false) {
  if (!authStatus) return;
  authStatus.textContent = message;
  authStatus.classList.toggle('error-text', isError);
  authStatus.classList.toggle('success-text', !isError);
}

if (authForm?.dataset.authForm === 'register') {
  const registerButton = authForm.querySelector('button[type="submit"]');
  const submitLabel = authForm.querySelector('[data-submit-label]');
  const resendButton = authForm.querySelector('[data-resend-verification]');
  const captchaContainer = authForm.querySelector('[data-turnstile-captcha]');
  const ageBandField = authForm.querySelector('[name="age_band"]');
  const adultFields = authForm.querySelector('[data-adult-fields]');
  const minorFields = authForm.querySelector('[data-minor-fields]');
  let pendingVerificationEmail = '';
  let registrationAvailable = false;
  let captchaToken = '';
  let captchaWidgetId = null;

  function setGroupState(container, visible) {
    if (!container) return;
    container.hidden = !visible;
    container.querySelectorAll('[data-required="true"]').forEach(field => {
      field.required = visible;
    });
  }

  function syncAgeFields() {
    const ageBand = ageBandField?.value || '';
    const isAdult = ageBand === '18_plus';
    const isMinor = ageBand === '13_15' || ageBand === '16_17';
    setGroupState(adultFields, isAdult);
    setGroupState(minorFields, isMinor);

    if (submitLabel) {
      const lang = document.documentElement.lang === 'en' ? 'en' : 'ru';
      const label = isMinor
        ? (lang === 'en' ? 'Send parent approval request' : 'Отправить запрос родителю')
        : isAdult
          ? (lang === 'en' ? 'Create account' : 'Создать аккаунт')
          : (lang === 'en' ? 'Choose an age group' : 'Выбери возрастную группу');
      submitLabel.textContent = label;
    }
    updateRegisterButton();
  }

  function updateRegisterButton() {
    if (registerButton) {
      const ageSelected = ['13_15', '16_17', '18_plus'].includes(ageBandField?.value);
      registerButton.disabled = !registrationAvailable || !captchaToken || !ageSelected || !authForm.checkValidity();
    }
  }

  function resetCaptcha() {
    captchaToken = '';
    if (window.turnstile && captchaWidgetId !== null) {
      window.turnstile.reset(captchaWidgetId);
    }
    updateRegisterButton();
  }

  function loadTurnstileScript() {
    if (window.turnstile) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-turnstile-api]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstileApi = 'true';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Не удалось загрузить проверку безопасности.'));
      document.head.append(script);
    });
  }

  resendButton?.addEventListener('click', async () => {
    if (!pendingVerificationEmail) return;
    resendButton.disabled = true;
    try {
      const data = await authRequest('/resend-verification', { email: pendingVerificationEmail });
      showAuthMessage(data.message || 'Проверь почту.');
    } catch (error) {
      showAuthMessage(error.message, true);
    } finally {
      resendButton.disabled = false;
    }
  });

  if (registerButton) registerButton.disabled = true;
  syncAgeFields();

  authForm.addEventListener('input', updateRegisterButton);
  authForm.addEventListener('change', () => {
    syncAgeFields();
    updateRegisterButton();
  });

  fetch('/api/registration-status', { cache: 'no-store' })
    .then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось проверить регистрацию.');
      return data;
    })
    .then(async data => {
      if (!data.available) {
        showAuthMessage(data.message || 'Регистрация пока недоступна.', true);
        return;
      }
      if (!data.captchaSiteKey) {
        showAuthMessage('Проверка безопасности не настроена. Регистрация пока недоступна.', true);
        return;
      }

      await loadTurnstileScript();
      if (!window.turnstile || !captchaContainer) {
        throw new Error('Не удалось инициализировать проверку безопасности.');
      }

      registrationAvailable = true;
      captchaWidgetId = window.turnstile.render(captchaContainer, {
        sitekey: data.captchaSiteKey,
        action: 'qe_registration',
        theme: 'light',
        callback(token) {
          captchaToken = token;
          updateRegisterButton();
          showAuthMessage('Проверка безопасности пройдена.');
        },
        'expired-callback'() {
          captchaToken = '';
          updateRegisterButton();
          showAuthMessage('Проверка безопасности истекла. Пройди её ещё раз.', true);
        },
        'error-callback'() {
          captchaToken = '';
          updateRegisterButton();
          showAuthMessage('Не удалось пройти проверку безопасности. Попробуй ещё раз.', true);
        }
      });
      updateRegisterButton();
    })
    .catch(error => showAuthMessage(error.message, true));

  authForm.addEventListener('submit', async event => {
    event.preventDefault();
    syncAgeFields();
    if (!authForm.checkValidity()) {
      authForm.reportValidity();
      return;
    }
    if (!captchaToken) {
      showAuthMessage('Сначала пройди проверку безопасности.', true);
      return;
    }

    const form = new FormData(authForm);
    const ageBand = String(form.get('age_band') || '');
    if (registerButton) registerButton.disabled = true;

    try {
      if (ageBand === '18_plus') {
        const email = String(form.get('email') || '').trim().toLowerCase();
        const data = await authRequest('/register', {
          email,
          password: form.get('password'),
          age_band: ageBand,
          adult_confirmed: form.get('adult_confirmed') === 'on',
          country_code: String(form.get('country_code') || '').trim().toUpperCase(),
          preferred_language: form.get('preferred_language') || 'ru',
          terms_accepted: form.get('terms_accepted') === 'on',
          privacy_accepted: form.get('privacy_accepted') === 'on',
          personal_data_accepted: form.get('personal_data_accepted') === 'on',
          turnstile_token: captchaToken
        });
        pendingVerificationEmail = email;
        if (resendButton) resendButton.hidden = !data.emailPending;
        showAuthMessage(data.message || 'Проверь почту для продолжения.');
      } else {
        const data = await authRequest('/guardian-consent-request', {
          age_band: ageBand,
          age_confirmed: form.get('age_confirmed') === 'on',
          country_code: String(form.get('country_code') || '').trim().toUpperCase(),
          guardian_email: String(form.get('guardian_email') || '').trim().toLowerCase(),
          turnstile_token: captchaToken
        });
        showAuthMessage(data.message || 'Письмо родителю отправлено.');
      }
      authForm.reset();
      syncAgeFields();
    } catch (error) {
      showAuthMessage(error.message, true);
    } finally {
      resetCaptcha();
    }
  });
}
if (authForm?.dataset.authForm === 'login') {
  authForm.addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(authForm);
    const button = authForm.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await authRequest('/login', { email: form.get('email'), password: form.get('password') });
      const me = await fetch('/api/auth/me', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null);
      location.href = me?.user?.onboarding_completed_at ? '/plan.html' : '/onboarding.html';
    } catch (error) {
      showAuthMessage(error.message, true);
    } finally {
      button.disabled = false;
    }
  });
}

if (authForm?.dataset.authForm === 'forgot') {
  authForm.addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(authForm);
    try {
      const data = await authRequest('/password/forgot', { email: form.get('email') });
      showAuthMessage(data.message);
    } catch (error) {
      showAuthMessage(error.message, true);
    }
  });
}

if (authForm?.dataset.authForm === 'reset') {
  authForm.addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(authForm);
    try {
      const data = await authRequest('/password/reset', {
        token: new URLSearchParams(location.search).get('token'),
        password: form.get('password')
      });
      showAuthMessage(data.message);
      setTimeout(() => { location.href = '/login.html'; }, 1800);
    } catch (error) {
      showAuthMessage(error.message, true);
    }
  });
}

const verifyPage = document.querySelector('[data-verify-email]');
if (verifyPage) {
  const token = new URLSearchParams(location.search).get('token');
  if (!token) showAuthMessage('В ссылке отсутствует токен подтверждения.', true);
  else authRequest('/verify-email', { token })
    .then(data => showAuthMessage(data.message))
    .catch(error => showAuthMessage(error.message, true));
}
