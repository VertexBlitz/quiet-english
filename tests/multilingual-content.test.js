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

import { readFileSync } from 'node:fs';

const germanExercises = JSON.parse(readFileSync(new URL('../content/seed-exercises.de.json', import.meta.url), 'utf8'));
const germanPlans = JSON.parse(readFileSync(new URL('../content/plan-templates.de.json', import.meta.url), 'utf8'));

test('German exercise library covers all CEFR bands with unique IDs', () => {
  assert.equal(germanExercises.length, 21);
  assert.deepEqual(
    [...new Set(germanExercises.map(exercise => exercise.level))].sort(),
    ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  );
  assert.ok(germanExercises.every(exercise => exercise.language_code === 'de'));
  assert.equal(new Set(germanExercises.map(exercise => exercise.id)).size, germanExercises.length);
});

test('German four-week plans reference only German exercises', () => {
  const exerciseIds = new Set(germanExercises.map(exercise => exercise.id));
  assert.equal(germanPlans.length, 6);
  for (const plan of germanPlans) {
    assert.equal(plan.language_code, 'de');
    assert.equal(plan.weekly_themes.length, 4);
    for (const week of plan.weekly_themes) {
      assert.equal(week.tasks.length, 7);
      for (const taskId of week.tasks) assert.ok(exerciseIds.has(taskId), plan.id + ': ' + taskId);
    }
  }
});

const germanSkillTasks = JSON.parse(readFileSync(new URL('../content/skill-practice-tasks.de.json', import.meta.url), 'utf8'));

test('German Skills Lab task catalog covers all four practical skills', () => {
  assert.equal(germanSkillTasks.length, 10);
  assert.deepEqual(
    [...new Set(germanSkillTasks.map(task => task.skill))].sort(),
    ['listening', 'pronunciation', 'speaking', 'writing']
  );
  assert.ok(germanSkillTasks.every(task => task.language_code === 'de'));
  assert.equal(new Set(germanSkillTasks.map(task => task.id)).size, germanSkillTasks.length);
  for (const task of germanSkillTasks) {
    assert.ok(task.title);
    assert.ok(task.description);
    assert.ok(task.content && typeof task.content === 'object');
  }
});
