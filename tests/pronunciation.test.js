import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pronunciationConfigured,
  validateWavPcm16k,
  toPublicPronunciationResult,
  pronunciationTasks
} from '../src/speech/pronunciation.js';

function makeWav({ sampleRate = 16000, channels = 1, bits = 16, seconds = 2 } = {}) {
  const dataBytes = sampleRate * channels * (bits / 8) * seconds;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bits / 8), 28);
  header.writeUInt16LE(channels * (bits / 8), 32);
  header.writeUInt16LE(bits, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  return Buffer.concat([header, Buffer.alloc(dataBytes)]);
}

test('pronunciation scoring stays disabled until explicitly enabled with server credentials', () => {
  assert.equal(pronunciationConfigured({}), false);
  assert.equal(pronunciationConfigured({
    AZURE_SPEECH_ENABLED: 'true',
    AZURE_SPEECH_KEY: 'not-a-real-key-value',
    AZURE_SPEECH_REGION: 'westeurope'
  }), true);
  assert.equal(pronunciationConfigured({
    AZURE_SPEECH_ENABLED: 'true',
    AZURE_SPEECH_KEY: 'not-a-real-key-value',
    AZURE_SPEECH_REGION: 'westeurope',
    AZURE_SPEECH_GUARDIAN_APPROVED: 'false'
  }), false);
  assert.equal(pronunciationConfigured({
    AZURE_SPEECH_ENABLED: 'true',
    AZURE_SPEECH_KEY: 'not-a-real-key-value',
    AZURE_SPEECH_REGION: 'westeurope',
    AZURE_SPEECH_GUARDIAN_APPROVED: 'true'
  }), true);
  assert.equal(pronunciationConfigured({
    AZURE_SPEECH_ENABLED: 'false',
    AZURE_SPEECH_KEY: 'not-a-real-key-value',
    AZURE_SPEECH_REGION: 'westeurope'
  }), false);
  assert.equal(pronunciationConfigured({
    AZURE_SPEECH_ENABLED: 'true',
    AZURE_SPEECH_KEY: 'x',
    AZURE_SPEECH_REGION: 'westeurope'
  }), false);
});

test('pronunciation task bank contains fixed reference passages', () => {
  assert.equal(Object.keys(pronunciationTasks).length, 8);
  assert.ok(pronunciationTasks.speak_read_aloud_01.referenceText.length > 20);
});

test('WAV validation accepts 16 kHz mono PCM and rejects other formats', () => {
  assert.equal(validateWavPcm16k(makeWav()).ok, true);
  assert.equal(validateWavPcm16k(makeWav({ sampleRate: 44100 })).ok, false);
  assert.equal(validateWavPcm16k(makeWav({ channels: 2 })).ok, false);
  assert.equal(validateWavPcm16k(Buffer.from('not audio')).ok, false);
});

test('pronunciation response exposes bounded scores and phoneme details only', () => {
  const result = toPublicPronunciationResult({
    RecognitionStatus: 'Success',
    NBest: [{
      Display: 'Hello there.',
      PronunciationAssessment: {
        PronScore: 83.25, AccuracyScore: 88, FluencyScore: 79,
        CompletenessScore: 100, ProsodyScore: 74
      },
      Words: [{
        Word: 'Hello',
        PronunciationAssessment: { AccuracyScore: 90, ErrorType: 'None' },
        Phonemes: [{
          Phoneme: 'ɛ',
          PronunciationAssessment: {
            AccuracyScore: 52,
            NBestPhonemes: [{ Phoneme: 'ə', Score: 100 }]
          }
        }]
      }]
    }]
  });
  assert.equal(result.pronunciationScore, 83.3);
  assert.equal(result.words[0].phonemes[0].expected, 'ɛ');
  assert.equal(result.words[0].phonemes[0].alternative, 'ə');
  assert.equal('audio' in result, false);
  assert.equal(toPublicPronunciationResult({ RecognitionStatus: 0, NBest: [{ PronunciationAssessment: { PronScore: 90 } }] }).pronunciationScore, 90);
  assert.throws(() => toPublicPronunciationResult({ RecognitionStatus: 'NoMatch' }));
});
