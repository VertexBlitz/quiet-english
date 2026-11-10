import test from 'node:test';
import assert from 'node:assert/strict';
import { languageCatalog, getLanguage, isAvailableLanguage, publicLanguageCatalog } from '../src/content/languages.js';
import { germanPlacementQuestions } from '../src/content/placement/de.js';

test('English and German are available while Spanish and French remain preparation states', () => {
  assert.equal(isAvailableLanguage('en'), true);
  assert.equal(isAvailableLanguage('de'), true);
  assert.equal(isAvailableLanguage('es'), false);
  assert.equal(isAvailableLanguage('fr'), false);
  assert.equal(getLanguage('unknown'), null);
});

test('public language catalog includes status without private data', () => {
  const catalog = publicLanguageCatalog();
  assert.deepEqual(catalog.map(item => item.code), ['en', 'de', 'es', 'fr']);
  assert.ok(catalog.every(item => ['active', 'coming_soon', 'disabled'].includes(item.status)));
  assert.equal(catalog[0].native_name, 'English');
});

test('German placement contains a balanced 14-question CEFR progression', () => {
  assert.equal(germanPlacementQuestions.length, 14);
  assert.deepEqual(
    [...new Set(germanPlacementQuestions.map(question => question.level))],
    ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  );
  for (const question of germanPlacementQuestions) {
    assert.match(question.id, /^DE-P\d{2}$/);
    assert.ok(question.prompt);
    assert.ok(question.options.length >= 2);
    assert.ok(question.options.some(option => option.id === question.answer));
  }
});
