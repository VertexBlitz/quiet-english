export const REGISTRATION_CAPTCHA_ACTION = 'qe_registration';
export const TERMS_POLICY_VERSION = '2026-11-08-1.1';
export const PRIVACY_POLICY_VERSION = '2026-11-08-1.1';
export const PERSONAL_DATA_CONSENT_VERSION = '2026-11-08-1.1';

export function isSupportedAgeBand(ageBand) {
  return ['13_15', '16_17', '18_plus'].includes(ageBand);
}

export function requiresGuardianConsent(ageBand) {
  return ageBand === '13_15' || ageBand === '16_17';
}

export function isAdultRegistration(ageBand, adultConfirmed) {
  return ageBand === '18_plus' && adultConfirmed === true;
}

export function normalizeCountryCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function isValidCountryCode(value) {
  return /^[A-Z]{2}$/.test(normalizeCountryCode(value));
}

export function isValidTurnstileResult(result, expectedHostname) {
  return Boolean(
    result &&
    result.success === true &&
    typeof result.hostname === 'string' &&
    result.hostname.toLowerCase() === String(expectedHostname || '').toLowerCase() &&
    result.action === REGISTRATION_CAPTCHA_ACTION
  );
}

export async function verifyTurnstileToken(token, {
  secretKey,
  expectedHostname,
  fetchImpl = fetch
} = {}) {
  if (!secretKey || !expectedHostname) {
    return { ok: false, reason: 'not_configured' };
  }
  if (typeof token !== 'string' || token.length < 1 || token.length > 2048) {
    return { ok: false, reason: 'invalid_token' };
  }

  try {
    const body = new URLSearchParams({
      secret: secretKey,
      response: token
    });
    const response = await fetchImpl(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!response.ok) return { ok: false, reason: 'provider_unavailable' };
    const result = await response.json();
    return isValidTurnstileResult(result, expectedHostname)
      ? { ok: true }
      : { ok: false, reason: 'invalid_token' };
  } catch {
    return { ok: false, reason: 'provider_unavailable' };
  }
}
