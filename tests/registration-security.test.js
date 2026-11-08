import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSupportedAgeBand,
  requiresGuardianConsent,
  isAdultRegistration,
  isValidTurnstileResult,
  verifyTurnstileToken,
  REGISTRATION_CAPTCHA_ACTION
} from '../src/registration-security.js';

test('public registration supports coarse age bands only (13+)', () => {
  assert.equal(isSupportedAgeBand('13_15'), true);
  assert.equal(isSupportedAgeBand('16_17'), true);
  assert.equal(isSupportedAgeBand('18_plus'), true);
  assert.equal(isSupportedAgeBand('under_13'), false);
  assert.equal(isSupportedAgeBand('2009-01-01'), false);
  assert.equal(isSupportedAgeBand(undefined), false);
});

test('all under-18 age bands require prior guardian consent', () => {
  assert.equal(requiresGuardianConsent('13_15'), true);
  assert.equal(requiresGuardianConsent('16_17'), true);
  assert.equal(requiresGuardianConsent('18_plus'), false);
});

test('adult self-registration requires the 18+ band and explicit confirmation', () => {
  assert.equal(isAdultRegistration('18_plus', true), true);
  assert.equal(isAdultRegistration('18_plus', false), false);
  assert.equal(isAdultRegistration('16_17', true), false);
  assert.equal(isAdultRegistration('13_15', true), false);
});

test('Turnstile Siteverify result must be successful and match hostname and action', () => {
  const valid = {
    success: true,
    hostname: 'quiet-english-speaking-preview.onrender.com',
    action: REGISTRATION_CAPTCHA_ACTION
  };
  assert.equal(isValidTurnstileResult(valid, valid.hostname), true);
  assert.equal(isValidTurnstileResult({ ...valid, success: false }, valid.hostname), false);
  assert.equal(isValidTurnstileResult({ ...valid, hostname: 'attacker.example' }, valid.hostname), false);
  assert.equal(isValidTurnstileResult({ ...valid, action: 'login' }, valid.hostname), false);
});

test('Turnstile verification sends the token to Siteverify and accepts a valid result', async () => {
  let request;
  const result = await verifyTurnstileToken('single-use-token', {
    secretKey: 'test-secret',
    expectedHostname: 'quiet-english-speaking-preview.onrender.com',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({
          success: true,
          hostname: 'quiet-english-speaking-preview.onrender.com',
          action: REGISTRATION_CAPTCHA_ACTION
        })
      };
    }
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(request.url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.equal(request.options.method, 'POST');
  assert.equal(new URLSearchParams(request.options.body).get('response'), 'single-use-token');
  assert.equal(new URLSearchParams(request.options.body).get('secret'), 'test-secret');
});

test('Turnstile verification fails closed when not configured or invalid', async () => {
  assert.deepEqual(
    await verifyTurnstileToken('token', { secretKey: '', expectedHostname: 'example.com' }),
    { ok: false, reason: 'not_configured' }
  );
  assert.deepEqual(
    await verifyTurnstileToken('', { secretKey: 'secret', expectedHostname: 'example.com' }),
    { ok: false, reason: 'invalid_token' }
  );
});
