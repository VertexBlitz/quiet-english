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


import {
  buildPracticeGenerationPrompt,
  gradeGeneratedPracticeExercise,
  parseGeneratedPracticeExercise,
  validatePracticeGenerationRequest
} from '../src/practice-generation.js';

const samplePracticePayload = (count = 5) => ({
  title: 'A busy morning',
  instructions: 'Choose the best answer for each question.',
  passage: '',
  questions: Array.from({ length: count }, (_, index) => ({
    id: 'q' + (index + 1),
    prompt: 'Choose the correct form for sentence ' + (index + 1) + '.',
    category: 'grammar',
    options: [
      { id: 'a', text: 'go' },
      { id: 'b', text: 'goes' },
      { id: 'c', text: 'going' },
      { id: 'd', text: 'gone' }
    ],
    correct_option_id: 'b',
    explanation: 'Use the third-person singular form with he, she or it.'
  }))
});

test('validates AI practice level, skill and topic', () => {
  assert.equal(validatePracticeGenerationRequest({
    level: 'B2', skill: 'grammar', topic: 'Science'
  }).ok, true);
  assert.equal(validatePracticeGenerationRequest({
    level: 'C2', skill: 'grammar', topic: 'Science'
  }).ok, false);
  assert.equal(validatePracticeGenerationRequest({
    level: 'A2', skill: 'unknown', topic: 'Science'
  }).ok, false);
  assert.equal(validatePracticeGenerationRequest({
    level: 'A2', skill: 'reading', topic: 'Unknown'
  }).ok, false);
});

test('builds distinct level and skill instructions for AI practice', () => {
  const request = validatePracticeGenerationRequest({
    level: 'B1', skill: 'reading', topic: 'Science'
  }).value;
  const prompt = buildPracticeGenerationPrompt(request);
  assert.match(prompt, /CEFR B1/u);
  assert.match(prompt, /reading passage/u);
  assert.match(prompt, /exactly four for reading/u);
});

test('parses a valid grammar quiz and retains answers only in the server exercise object', () => {
  const exercise = parseGeneratedPracticeExercise(
    JSON.stringify(samplePracticePayload()),
    { level: 'A2', skill: 'grammar', topic: 'Everyday life' }
  );
  assert.equal(exercise.questions.length, 5);
  assert.equal(exercise.questions[0].correct_option_id, 'b');
  assert.equal(exercise.questions[0].options.length, 4);
});

test('parses listening and reading passages with four comprehension questions', () => {
  const payload = samplePracticePayload(4);
  payload.passage = 'A group of students visits a science museum on Friday. They discover how clean energy can power homes and learn why careful research matters. Their guide explains how solar panels use sunlight and how wind turbines create electricity. At the end of the visit, each student writes one question for a researcher. A small exhibition also shows how engineers test new ideas before using them in real buildings and public spaces.';
  const reading = parseGeneratedPracticeExercise(
    JSON.stringify(payload),
    { level: 'B1', skill: 'reading', topic: 'Science' }
  );
  assert.equal(reading.questions.length, 4);
  assert.ok(reading.passage.length > 80);
});

test('grades all answers on the server and returns explanations without accepting malformed submissions', () => {
  const exercise = parseGeneratedPracticeExercise(
    JSON.stringify(samplePracticePayload()),
    { level: 'A2', skill: 'grammar', topic: 'Everyday life' }
  );
  const answers = exercise.questions.map((question, index) => ({
    question_id: question.id,
    option_id: index < 3 ? 'b' : 'a'
  }));
  const result = gradeGeneratedPracticeExercise(exercise, answers);
  assert.equal(result.correct, 3);
  assert.equal(result.total, 5);
  assert.equal(result.score, 60);
  assert.equal(result.results[0].is_correct, true);
  assert.equal(result.results[3].correct_answer, 'goes');
  assert.throws(
    () => gradeGeneratedPracticeExercise(exercise, answers.slice(0, 2)),
    /все вопросы/u
  );
  assert.throws(
    () => gradeGeneratedPracticeExercise(exercise, [
      ...answers.slice(0, 4),
      answers[0]
    ]),
    /некорректно/u
  );
});

test('rejects invalid AI exercise schema and ambiguous answer options', () => {
  const payload = samplePracticePayload();
  payload.questions[0].options[1].text = 'go';
  assert.throws(
    () => parseGeneratedPracticeExercise(JSON.stringify(payload), {
      level: 'A2', skill: 'grammar', topic: 'Everyday life'
    }),
    /Варианты ответа/u
  );
  assert.throws(
    () => parseGeneratedPracticeExercise('not json', {
      level: 'A2', skill: 'grammar', topic: 'Everyday life'
    }),
    /непонятном формате/u
  );
});

test('normalizes common AI question aliases and option answer formats', () => {
  const payload = {
    title: 'Grammar in context',
    instructions: 'Choose the best answer for each sentence.',
    passage: '',
    questions: Array.from({ length: 5 }, (_, index) => ({
      question: 'Which form completes sentence ' + (index + 1) + '?',
      type: 'grammar question',
      options: [
        { key: 'A', value: 'go', is_correct: false },
        { key: 'B', value: 'goes', is_correct: true },
        { key: 'C', value: 'going', is_correct: false },
        { key: 'D', value: 'gone', is_correct: false }
      ],
      correct_answer: 'goes',
      feedback: 'Use the third-person singular form with he, she or it.'
    }))
  };

  const exercise = parseGeneratedPracticeExercise(JSON.stringify(payload), {
    level: 'A2', skill: 'grammar', topic: 'Everyday life'
  });

  assert.equal(exercise.questions.length, 5);
  assert.equal(exercise.questions[0].prompt, 'Which form completes sentence 1?');
  assert.equal(exercise.questions[0].category, 'grammar');
  assert.deepEqual(exercise.questions[0].options.map(option => option.id), ['a', 'b', 'c', 'd']);
  assert.equal(exercise.questions[0].correct_option_id, 'b');
  assert.match(exercise.questions[0].explanation, /third-person singular/u);
});

test('accepts string options and letter-based correct answer fields', () => {
  const payload = samplePracticePayload();
  payload.questions = payload.questions.map(question => ({
    question: question.prompt,
    choices: ['go', 'goes', 'going', 'gone'],
    correctAnswer: 'B',
    explanation: question.explanation
  }));

  const exercise = parseGeneratedPracticeExercise(JSON.stringify(payload), {
    level: 'A2', skill: 'grammar', topic: 'Everyday life'
  });

  assert.equal(exercise.questions[0].correct_option_id, 'b');
  assert.equal(exercise.questions[0].options[1].text, 'goes');
});

test('uses the requested exercise skill when an AI category is not recognised', () => {
  const payload = samplePracticePayload();
  payload.questions[0].category = 'grammar practice';
  const exercise = parseGeneratedPracticeExercise(JSON.stringify(payload), {
    level: 'A2', skill: 'grammar', topic: 'Everyday life'
  });
  assert.equal(exercise.questions[0].category, 'grammar');
});

test('validates and keeps a bounded list of adaptive review focus points', () => {
  const result = validatePracticeGenerationRequest({
    level: 'B1',
    skill: 'grammar',
    topic: 'Science',
    focus: [
      {
        area: 'Zero Conditional',
        prompt: 'If we ___ enough water, plants cannot grow.',
        selectedAnswer: "didn't give",
        correctAnswer: "don't give",
        explanation: 'Use present simple in both clauses for general truths.'
      },
      { area: 'Comparative adjectives', prompt: 'The lab is ___ than the classroom.' },
      { area: 'Phrasal verbs', prompt: 'Take off means remove equipment.' },
      { area: 'Past Simple', prompt: 'They ___ the sample last year.' },
      { area: 'Cause and effect', prompt: 'Choose the correct conjunction.' },
      { area: 'Ignored extra', prompt: 'This sixth topic must be dropped.' }
    ]
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.focus.length, 5);
  assert.equal(result.value.focus[0].area, 'Zero Conditional');
  assert.equal(result.value.focus[0].correctAnswer, "don't give");
});

test('builds a focused remedial prompt from the learner mistakes without repeating old questions', () => {
  const request = validatePracticeGenerationRequest({
    level: 'B1',
    skill: 'grammar',
    topic: 'Science',
    focus: [{
      area: 'Zero Conditional',
      prompt: 'If we ___ enough water, plants cannot grow.',
      selectedAnswer: "didn't give",
      correctAnswer: "don't give",
      explanation: 'Use present simple in both clauses for general truths.'
    }]
  }).value;
  const prompt = buildPracticeGenerationPrompt(request);
  assert.match(prompt, /ADAPTIVE REVIEW/u);
  assert.match(prompt, /Zero Conditional/u);
  assert.match(prompt, /didn't give/u);
  assert.match(prompt, /don't give/u);
  assert.match(prompt, /fresh sentences and new options/u);
});

test('preserves the exact learning point through grading for future adaptive review', () => {
  const payload = samplePracticePayload();
  payload.questions[0].learning_point = 'Past Simple';
  const exercise = parseGeneratedPracticeExercise(JSON.stringify(payload), {
    level: 'B1', skill: 'grammar', topic: 'Science'
  });
  assert.equal(exercise.questions[0].learning_point, 'Past Simple');

  const answers = exercise.questions.map(question => ({
    question_id: question.id,
    option_id: question.id === 'q1' ? 'a' : 'b'
  }));
  const result = gradeGeneratedPracticeExercise(exercise, answers);
  assert.equal(result.results[0].is_correct, false);
  assert.equal(result.results[0].learning_point, 'Past Simple');
});
