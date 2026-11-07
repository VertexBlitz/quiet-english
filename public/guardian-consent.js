const statusElement = document.querySelector('[data-guardian-status]');
const consentFlow = document.querySelector('[data-consent-flow]');
const consentSummary = document.querySelector('[data-consent-summary]');
const parentSignupForm = document.querySelector('[data-parent-signup]');
const parentWithdrawalForm = document.querySelector('[data-parent-withdrawal]');
const withdrawalRequestForm = document.querySelector('[data-withdrawal-request]');

function showGuardianMessage(message, isError = false) {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.classList.toggle('error-text', isError);
  statusElement.classList.toggle('success-text', !isError);
}

async function guardianRequest(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос.');
  return data;
}

function ageBandLabel(value) {
  if (value === '13_15') return '13–15';
  if (value === '16_17') return '16–17';
  return '';
}

const params = new URLSearchParams(location.search);
const token = params.get('token') || '';

if (params.get('mode') === 'withdrawal-request') {
  if (withdrawalRequestForm) withdrawalRequestForm.hidden = false;
  showGuardianMessage('Укажи данные аккаунта для запроса отзыва согласия.');
} else if (!token) {
  showGuardianMessage('В ссылке отсутствует токен подтверждения.', true);
} else {
  fetch('/api/auth/guardian-consent-info?token=' + encodeURIComponent(token), {
    cache: 'no-store',
    credentials: 'same-origin'
  })
    .then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Ссылка недействительна.');
      return data;
    })
    .then(data => {
      if (consentFlow) consentFlow.hidden = false;
      if (data.requestType === 'signup') {
        if (parentSignupForm) parentSignupForm.hidden = false;
        const age = ageBandLabel(data.ageBand);
        if (consentSummary) {
          consentSummary.textContent = 'Запрошено создание аккаунта для возрастной группы ' +
            age + '. Дата рождения не запрашивается.';
        }
        showGuardianMessage('Ссылка действительна. Проверь условия перед подтверждением.');
      } else if (data.requestType === 'withdrawal') {
        if (parentWithdrawalForm) parentWithdrawalForm.hidden = false;
        if (consentSummary) {
          consentSummary.textContent = 'Подтверди отзыв родительского согласия для связанного аккаунта.';
        }
        showGuardianMessage('Ссылка для отзыва согласия действительна.');
      } else {
        throw new Error('Неизвестный тип запроса.');
      }
    })
    .catch(error => showGuardianMessage(error.message, true));
}

parentSignupForm?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!parentSignupForm.reportValidity()) return;
  const form = new FormData(parentSignupForm);
  const button = parentSignupForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const data = await guardianRequest('/api/auth/guardian-consent-complete', {
      token,
      guardian_confirmed: form.get('guardian_confirmed') === 'on',
      minimum_age_confirmed: form.get('minimum_age_confirmed') === 'on',
      terms_accepted: form.get('terms_accepted') === 'on',
      privacy_accepted: form.get('privacy_accepted') === 'on',
      personal_data_accepted: form.get('personal_data_accepted') === 'on',
      country_code: String(form.get('country_code') || '').trim().toUpperCase(),
      email: form.get('email'),
      password: form.get('password'),
      preferred_language: form.get('preferred_language') || 'ru'
    });
    parentSignupForm.hidden = true;
    showGuardianMessage(data.message || 'Родительское согласие сохранено.');
  } catch (error) {
    showGuardianMessage(error.message, true);
  } finally {
    button.disabled = false;
  }
});

parentWithdrawalForm?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!parentWithdrawalForm.reportValidity()) return;
  const form = new FormData(parentWithdrawalForm);
  const button = parentWithdrawalForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const data = await guardianRequest('/api/auth/guardian-consent-withdraw', {
      token,
      confirm_withdrawal: form.get('confirm_withdrawal') === 'on'
    });
    parentWithdrawalForm.hidden = true;
    showGuardianMessage(data.message || 'Согласие отозвано, аккаунт удалён.');
  } catch (error) {
    showGuardianMessage(error.message, true);
  } finally {
    button.disabled = false;
  }
});

withdrawalRequestForm?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!withdrawalRequestForm.reportValidity()) return;
  const form = new FormData(withdrawalRequestForm);
  const button = withdrawalRequestForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const data = await guardianRequest('/api/auth/guardian-withdrawal-request', {
      guardian_email: form.get('guardian_email'),
      child_email: form.get('child_email')
    });
    withdrawalRequestForm.hidden = true;
    showGuardianMessage(data.message || 'Если данные совпадают, письмо будет отправлено родителю.');
  } catch (error) {
    showGuardianMessage(error.message, true);
  } finally {
    button.disabled = false;
  }
});
