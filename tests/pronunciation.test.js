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
    assert.ok(passages.every(item => item.text.split(/\s+/u).length <= 55));
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

import {
  buildSpeakingGenerationPrompt,
  parseGeneratedSpeakingPassage,
  validateSpeakingGenerationRequest
} from '../src/speaking.js';

test('validates CEFR level and topic before requesting a generated passage', () => {
  assert.equal(validateSpeakingGenerationRequest({
    level: 'b2', topic: 'Science'
  }).ok, true);
  assert.equal(validateSpeakingGenerationRequest({
    level: 'C2', topic: 'Science'
  }).ok, false);
  assert.equal(validateSpeakingGenerationRequest({
    level: 'A2', topic: 'Unlisted topic'
  }).ok, false);
});

test('limits recent examples sent to the model and builds a level-specific prompt', () => {
  const validated = validateSpeakingGenerationRequest({
    level: 'C1',
    topic: 'History and culture',
    avoid: [' first   passage ', 'second', 'third', 'fourth', 'fifth']
  });
  assert.equal(validated.ok, true);
  assert.equal(validated.value.avoid.length, 4);

  const prompt = buildSpeakingGenerationPrompt(validated.value);
  assert.match(prompt, /CEFR C1/u);
  assert.match(prompt, /History and culture/u);
  assert.match(prompt, /Do not repeat/u);
  assert.match(prompt, /first passage/u);
});

test('parses a valid generated English passage and returns its validated metadata', () => {
  const passage = parseGeneratedSpeakingPassage(JSON.stringify({
    title: 'A visit to the library',
    passage: 'Mia visits the city library after school. She chooses a book about space and learns how scientists study distant planets. Before going home, she writes three new words in her notebook.'
  }), { level: 'A2', topic: 'Books and media' });

  assert.equal(passage.level, 'A2');
  assert.equal(passage.topic, 'Books and media');
  assert.equal(passage.title, 'A visit to the library');
  assert.ok(passage.wordCount >= 15 && passage.wordCount <= 65);
});

test('rejects malformed, too-short and non-English AI responses', () => {
  assert.throws(
    () => parseGeneratedSpeakingPassage('not json', { level: 'A1', topic: 'Travel' }),
    /непонятном формате/u
  );
  assert.throws(
    () => parseGeneratedSpeakingPassage(JSON.stringify({
      title: 'Short',
      passage: 'Too few words.'
    }), { level: 'A1', topic: 'Travel' }),
    /неподходящей длины/u
  );
  assert.throws(
    () => parseGeneratedSpeakingPassage(JSON.stringify({
      title: 'Не английский',
      passage: 'Это короткий текст на русском языке для проверки формата и языка.'
    }), { level: 'A1', topic: 'Travel' }),
    /неподходящей длины/u
  );
});
