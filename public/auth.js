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
  authForm.addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(authForm);
    const button = authForm.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const data = await authRequest('/register', {
        email: form.get('email'),
        password: form.get('password'),
        age_band: form.get('age_band'),
        country_code: String(form.get('country_code') || '').trim().toUpperCase(),
        preferred_language: form.get('preferred_language') || 'ru',
        terms_accepted: form.get('terms_accepted') === 'on',
        privacy_accepted: form.get('privacy_accepted') === 'on'
      });
      showAuthMessage(data.message || 'Проверь почту для продолжения.');
      authForm.reset();
      updateGuardianFields();
    } catch (error) {
      showAuthMessage(error.message, true);
    } finally {
      button.disabled = false;
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
