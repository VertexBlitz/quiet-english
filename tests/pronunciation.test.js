import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePronunciationResult } from '../src/pronunciation.js';

test('normalizes comprehensive pronunciation scores and phoneme feedback', () => {
  const result = normalizePronunciationResult({
    RecognitionStatus: 'Success',
    NBest: [{
      Display: 'Good morning.',
      PronScore: 91,
      AccuracyScore: 94,
      FluencyScore: 88,
      CompletenessScore: 100,
      ProsodyScore: 86,
      Words: [{
        Word: 'morning',
        AccuracyScore: 90,
        ErrorType: 'None',
        Phonemes: [{ Phoneme: 'm', AccuracyScore: 100 }],
        Syllables: [{ Syllable: 'mɔr', AccuracyScore: 90 }]
      }]
    }]
  });
  assert.equal(result.pronScore, 91);
  assert.equal(result.words[0].phonemes[0].phoneme, 'm');
  assert.equal(result.words[0].syllables[0].text, 'mɔr');
});

test('returns null when speech could not be recognized', () => {
  assert.equal(normalizePronunciationResult({ RecognitionStatus: 'NoMatch', NBest: [] }), null);
});
