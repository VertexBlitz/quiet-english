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

import { readLocalPronunciationHistory, saveLocalPronunciationAttempt } from '../public/pronunciation-storage.js';

test('saves local speaking history and keeps only the latest eight attempts', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  for (let index = 0; index < 10; index++) {
    assert.equal(saveLocalPronunciationAttempt(storage, {
      reference_text: 'A speaking passage',
      word_match_score: index,
      created_at: new Date(index * 1000).toISOString()
    }), true);
  }
  const history = readLocalPronunciationHistory(storage);
  assert.equal(history.length, 8);
  assert.equal(history[0].word_match_score, 9);
  assert.equal(history.at(-1).word_match_score, 2);
});

test('returns an empty local history when browser storage is unavailable or corrupt', () => {
  assert.deepEqual(readLocalPronunciationHistory({
    getItem: () => '{not valid json'
  }), []);
  assert.equal(saveLocalPronunciationAttempt({
    getItem: () => null,
    setItem: () => { throw new Error('storage full'); }
  }, { reference_text: 'Example' }), false);
});

import { PASSAGES, buildProgressSeries, getReviewWords } from '../public/pronunciation-content.js';

test('provides three speaking passages for every CEFR level from A1 to C1', () => {
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
  assert.equal(PASSAGES.length, 15);
  for (const level of levels) {
    const passages = PASSAGES.filter(item => item.level === level);
    assert.equal(passages.length, 3);
    assert.ok(passages.every(item => item.text.split(/\\s+/u).length <= 55));
  }
});

test('builds an error-practice list from unique missing and substituted words only', () => {
  const words = [
    { reference: 'will', recognized: "we'll", status: 'different' },
    { reference: 'after', recognized: '', status: 'missing' },
    { reference: 'will', recognized: '', status: 'missing' },
    { reference: 'today', recognized: 'today', status: 'match' },
    { reference: '', recognized: 'yesterday', status: 'extra' }
  ];
  assert.deepEqual(getReviewWords(words), ['will', 'after']);
});

test('builds a chronological progress series and keeps only the latest eight valid scores', () => {
  const attempts = Array.from({ length: 10 }, (_, index) => ({
    word_match_score: index * 10,
    created_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString()
  }));
  attempts.push({ word_match_score: 140, created_at: '2026-02-01T00:00:00Z' });
  const series = buildProgressSeries(attempts);
  assert.equal(series.length, 8);
  assert.equal(series[0].score, 20);
  assert.equal(series.at(-1).score, 90);
  assert.ok(series[0].dateLabel);
});

test('returns an empty progress series when no score history exists', () => {
  assert.deepEqual(buildProgressSeries([]), []);
});
