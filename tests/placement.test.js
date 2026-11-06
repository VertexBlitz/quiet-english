import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateLevel, publicQuestions, placementQuestions } from '../src/content/placement.js';

test('placement level mapping covers all CEFR bands used by the product', () => {
  assert.equal(estimateLevel(0), 'Pre-A1');
  assert.equal(estimateLevel(2), 'A1');
  assert.equal(estimateLevel(4), 'A2');
  assert.equal(estimateLevel(7), 'B1');
  assert.equal(estimateLevel(10), 'B2');
  assert.equal(estimateLevel(12), 'C1');
  assert.equal(estimateLevel(14), 'C2');
});

test('placement questions expose options but never expose answer keys', () => {
  const questions = publicQuestions();
  assert.equal(questions.length, placementQuestions.length);
  for (const question of questions) {
    assert.ok(question.id);
    assert.ok(question.prompt);
    assert.ok(Array.isArray(question.options));
    assert.equal('answer', question.answer, undefined);
  }
});
