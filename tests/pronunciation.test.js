import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTranscript, tokenizeSpeech } from '../public/pronunciation-scoring.js';

test('normalizes punctuation and case before comparing words', () => {
  assert.deepEqual(tokenizeSpeech("The weather's lovely, TODAY!"), ["the", "weather's", "lovely", "today"]);
  const result = compareTranscript('The weather is lovely today.', 'the weather is lovely today');
  assert.equal(result.wordMatchPercent, 100);
  assert.equal(result.matched, 5);
});

test('marks missing, substituted and extra words separately', () => {
  const result = compareTranscript('We go to school every day', 'we went school every day yesterday');
  assert.equal(result.matched, 4);
  assert.equal(result.different, 1);
  assert.equal(result.missing, 1);
  assert.equal(result.extra, 1);
  assert.equal(result.words.some(item => item.status === 'different'), true);
  assert.equal(result.words.some(item => item.status === 'missing'), true);
  assert.equal(result.words.some(item => item.status === 'extra'), true);
});

test('returns zero match when no reference words are recognized', () => {
  const result = compareTranscript('Good morning everyone', '');
  assert.equal(result.wordMatchPercent, 0);
  assert.equal(result.missing, 3);
});

test('rejects an empty reference passage', () => {
  assert.throws(() => compareTranscript('', 'hello'), /Reference text/);
});
