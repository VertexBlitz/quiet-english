import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const publicPages = [
  'index.html',
  'login.html',
  'register.html',
  'account.html',
  'subscription.html',
  'privacy.html',
  'terms.html',
  'plan.html',
  'practice.html',
  'writing.html',
  'listening.html',
  'dictionary.html',
  'progress.html',
  'pronunciation.html',
  'knowledge.html',
  'review.html',
  'tutor.html',
  'method.html',
  'data-consent.html',
  'guardian-consent.html',
  'calendar.html',
  'studio.html',
  'offline.html'
];

test('all primary public pages load the shared stylesheet', async () => {
  for (const page of publicPages) {
    const html = await readFile(new URL('../public/' + page, import.meta.url), 'utf8');
    assert.match(html, /<head(?:\\s[^>]*)?>/i, page + ' must have a head element');
    assert.match(html, /<link\\s+rel=["']stylesheet["']\\s+href=["']\\/styles\\.css(?:\\?[^"']*)?["']/i, page + ' must load /styles.css');
  }
});

test('homepage restores a complete HTML document wrapper', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /^\\s*<!doctype html>/i);
  assert.match(html, /<html\\s+lang=["']ru["']/i);
  assert.match(html, /<head>/i);
  assert.match(html, /<body>/i);
});
