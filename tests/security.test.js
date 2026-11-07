import test from 'node:test';
import assert from 'node:assert/strict';
import { sameOrigin } from '../src/middleware/security.js';

function runMiddleware({ method = 'POST', origin, baseUrl, allowedOrigins } = {}) {
  const previousBaseUrl = process.env.APP_BASE_URL;
  const previousAllowedOrigins = process.env.ALLOWED_ORIGINS;

  if (baseUrl === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = baseUrl;

  if (allowedOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
  else process.env.ALLOWED_ORIGINS = allowedOrigins;

  const req = {
    method,
    get(name) {
      return name.toLowerCase() === 'origin' ? origin : undefined;
    }
  };

  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };

  let passed = false;
  try {
    sameOrigin(req, res, () => { passed = true; });
    return { passed, statusCode: res.statusCode, payload: res.payload };
  } finally {
    if (previousBaseUrl === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = previousBaseUrl;

    if (previousAllowedOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = previousAllowedOrigins;
  }
}

test('same-origin middleware allows safe read-only methods without Origin', () => {
  const result = runMiddleware({ method: 'GET' });
  assert.equal(result.passed, true);
  assert.equal(result.statusCode, 200);
});

test('same-origin middleware accepts the configured application origin', () => {
  const result = runMiddleware({
    origin: 'https://quiet-english.example/path',
    baseUrl: 'https://quiet-english.example'
  });
  assert.equal(result.passed, true);
});

test('same-origin middleware accepts an explicitly configured additional origin', () => {
  const result = runMiddleware({
    origin: 'https://preview.quiet-english.example',
    baseUrl: 'https://quiet-english.example',
    allowedOrigins: 'https://preview.quiet-english.example, https://staging.quiet-english.example'
  });
  assert.equal(result.passed, true);
});

test('same-origin middleware rejects missing and untrusted origins', () => {
  const missing = runMiddleware({
    baseUrl: 'https://quiet-english.example'
  });
  assert.equal(missing.passed, false);
  assert.equal(missing.statusCode, 403);

  const untrusted = runMiddleware({
    origin: 'https://attacker.example',
    baseUrl: 'https://quiet-english.example'
  });
  assert.equal(untrusted.passed, false);
  assert.equal(untrusted.statusCode, 403);
});

test('same-origin middleware rejects state-changing requests when no origin is configured', () => {
  const result = runMiddleware({
    origin: 'https://quiet-english.example'
  });
  assert.equal(result.passed, false);
  assert.equal(result.statusCode, 403);
});
