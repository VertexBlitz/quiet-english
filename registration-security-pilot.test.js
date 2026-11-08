import assert from 'node:assert/strict';
import test from 'node:test';

import { isAdultRegistration, isMinorRegistrationEnabled } from './src/registration-security.js';

test('minor registration is disabled by default', () => {
  assert.equal(isMinorRegistrationEnabled({}), false);
  assert.equal(isMinorRegistrationEnabled({ REGISTRATION_MINORS_ENABLED: 'true' }), false);
  assert.equal(isMinorRegistrationEnabled({ REGISTRATION_MINORS_LEGAL_APPROVED: 'true' }), false);
});

test('minor registration requires both explicit deployment flags', () => {
  assert.equal(isMinorRegistrationEnabled({
    REGISTRATION_MINORS_ENABLED: 'true',
    REGISTRATION_MINORS_LEGAL_APPROVED: 'true'
  }), true);
  assert.equal(isMinorRegistrationEnabled({
    REGISTRATION_MINORS_ENABLED: 'true',
    REGISTRATION_MINORS_LEGAL_APPROVED: 'false'
  }), false);
});

test('adult registration still requires the 18+ age band and explicit attestation', () => {
  assert.equal(isAdultRegistration('18_plus', true), true);
  assert.equal(isAdultRegistration('18_plus', false), false);
  assert.equal(isAdultRegistration('16_17', true), false);
  assert.equal(isAdultRegistration('13_15', true), false);
});
