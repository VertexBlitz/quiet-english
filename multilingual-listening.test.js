import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COURSE_QUESTION_BANKS,
  getCoursePlacementQuestions
} from './src/content/multilingual-courses.js';
import { LANGUAGE_PASSAGES } from './public/pronunciation-content.js';

const languages = ['es', 'fr', 'it', 'pt', 'pl', 'ja'];
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

test('each new course has one real listening exercise at every CEFR level', () => {
  for (const language of languages) {
    for (const level of levels) {
      const bank = COURSE_QUESTION_BANKS[language][level];
      assert.equal(bank.length, 8, language + ' ' + level + ' should retain eight starter exercises');
      const listening = bank.filter(item => item.skill === 'listening');
      assert.equal(listening.length, 1, language + ' ' + level + ' should have one listening exercise');
      assert.ok(listening[0].passage.trim().length >= 40, language + ' ' + level + ' should have a spoken passage');
      assert.equal(listening[0].options.length, 3);
      assert.ok(Number.isInteger(listening[0].answer));
      assert.ok(listening[0].explanationRu);
      assert.ok(listening[0].explanationEn);
    }
  }
});

test('listening exercises do not replace placement questions', () => {
  for (const language of languages) {
    const questions = getCoursePlacementQuestions(language);
    assert.equal(questions.length, 30, language + ' placement should still contain 30 questions');
    for (const level of levels) {
      assert.equal(questions.filter(question => question.level === level).length, 5);
    }
  }
});

test('Speaking Lab has two original passages for every language and CEFR level', () => {
  for (const language of languages) {
    const passages = LANGUAGE_PASSAGES[language];
    assert.equal(passages.length, 12, language + ' should have twelve speaking passages');
    for (const level of levels) {
      assert.equal(passages.filter(item => item.level === level).length, 2, language + ' ' + level);
    }
    assert.equal(new Set(passages.map(item => item.id)).size, passages.length);
  }
});
