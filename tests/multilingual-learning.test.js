import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('multilingual learning migration preserves legacy English data and adds independent course profiles', () => {
  const migration = read('db/migrations/013_multilingual_learning.sql');
  for (const code of ['en', 'de', 'es', 'fr', 'it', 'pt', 'pl', 'ja']) {
    assert.ok(migration.includes("('" + code + "'"), 'missing language catalog seed: ' + code);
  }

  assert.ok(migration.includes("('en', 'English', 'English', 'en-US', 'available'"));
  assert.ok(migration.includes("('de', 'German', 'Deutsch', 'de-DE', 'planned'"));
  assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS learner_language_profiles'));
  assert.ok(migration.includes("SELECT user_id, 'en', goal, self_assessed_level"));
  assert.ok(migration.includes('active_learning_language_code'));
  assert.ok(migration.includes('UNIQUE (user_id, language_code)'));
});

test('learning data tables are language-scoped and existing rows default to English', () => {
  const migration = read('db/migrations/013_multilingual_learning.sql');
  const tables = [
    'placement_attempts', 'learning_plans', 'plan_templates', 'exercises',
    'exercise_attempts', 'srs_items', 'error_journal', 'daily_activity',
    'knowledge_note_progress', 'knowledge_collections', 'knowledge_quiz_attempts',
    'learner_vocabulary', 'writing_submissions', 'listening_quiz_sessions',
    'listening_attempts', 'pronunciation_attempts', 'study_calendar_events',
    'learner_coach_reports', 'learner_focus_tasks'
  ];
  for (const table of tables) {
    assert.ok(
      migration.includes('ALTER TABLE ' + table + ' ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT \'en\''),
      table + ' must be scoped to a study language'
    );
  }
  assert.ok(migration.includes('PRIMARY KEY (user_id, language_code, activity_date)'));
  assert.ok(migration.includes('PRIMARY KEY (user_id, language_code, note_id)'));
  assert.ok(migration.includes('UNIQUE (user_id, language_code, item_type, item_ref)'));
  assert.ok(migration.includes('learner_vocabulary_user_language_word_idx'));
  assert.ok(migration.includes('knowledge_collections_user_language_name_idx'));
});

test('language catalog endpoints only enroll or activate published courses', () => {
  const route = read('src/routes/learning.js');
  assert.ok(route.includes("router.get('/languages'"));
  assert.ok(route.includes("router.post('/languages/enroll'"));
  assert.ok(route.includes("router.post('/languages/activate'"));
  assert.ok(route.includes("course_status !== 'available'"));
  assert.ok(route.includes('learner_language_profiles'));
  assert.ok(route.includes('active_learning_language_code'));
});

test('plans, exercises, review queue and progress are filtered by active study language', () => {
  const route = read('src/routes/learning.js');
  const db = read('src/db.js');
  assert.ok(route.includes('p.language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1)'));
  assert.ok(route.includes('language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$1)'));
  assert.ok(route.includes('ON CONFLICT (user_id,language_code,item_type,item_ref)'));
  assert.ok(db.includes('ON CONFLICT (user_id, language_code, activity_date)'));
});

test('onboarding and plan screens expose a separate target-language selector', () => {
  const onboarding = read('public/onboarding.html');
  const plan = read('public/plan.html');
  const client = read('public/learning.js');
  const styles = read('public/styles.css');
  const serviceWorker = read('public/sw.js');

  assert.ok(onboarding.includes('name="language_code"'));
  assert.ok(onboarding.includes('name="preferred_language"'));
  assert.ok(onboarding.includes('data-study-language-status'));
  assert.ok(plan.includes('data-active-language-switch'));
  assert.ok(client.includes('/languages/activate'));
  assert.ok(client.includes("language_code: form.get('language_code') || 'en'"));
  assert.ok(styles.includes('.study-language-control'));
  assert.ok(serviceWorker.includes("const CACHE='quiet-english-shell-v8'"));
  assert.ok(serviceWorker.includes('"/onboarding.html"'));
});


test('English-only tools refuse an unprepared study language', () => {
  const db = read('src/db.js');
  const learning = read('src/routes/learning.js');
  const writing = read('src/routes/writing.js');
  const studyTools = read('src/routes/study-tools.js');
  const pronunciation = read('src/routes/pronunciation.js');
  const server = read('server.js');

  assert.ok(db.includes('export function requireEnglishStudyLanguage'));
  assert.ok(db.includes('export function requireSpeechSupport'));
  assert.ok(writing.includes("router.post('/writing/review',requireEnglishStudyLanguage"));
  assert.ok(studyTools.includes("router.post('/listening/prepare',requireEnglishStudyLanguage"));
  assert.ok(pronunciation.includes('loadActiveStudyLanguage, requireSpeechSupport'));
  assert.ok(server.includes("app.post('/api/practice/instant'"));
  assert.ok(server.includes("app.post('/api/practice/generate'"));
  assert.ok(server.includes("app.post('/api/speaking/generate'"));
  assert.ok(server.includes('requireEnglishTargetCourse(req, res)'));
  assert.ok(learning.includes("if (!selectedTemplate && profile.language_code !== 'en')"));
});

test('knowledge, vocabulary, writing, speaking and study tools isolate saved data by language', () => {
  const knowledge = read('src/routes/knowledge.js');
  const writing = read('src/routes/writing.js');
  const speaking = read('src/routes/pronunciation.js');
  const studyTools = read('src/routes/study-tools.js');
  const db = read('src/db.js');

  assert.ok(knowledge.includes('loadActiveStudyLanguage'));
  assert.ok(knowledge.includes('ON CONFLICT (user_id,language_code,note_id)'));
  assert.ok(knowledge.includes('ON CONFLICT (user_id,language_code,LOWER(word))'));
  assert.ok(knowledge.includes('ON CONFLICT (user_id,language_code,item_type,item_ref)'));
  assert.ok(writing.includes('WHERE user_id=$1 AND language_code=$2 ORDER BY created_at DESC LIMIT 20'));
  assert.ok(writing.includes('WHERE id=$1 AND user_id=$2 AND language_code=$3'));
  assert.ok(speaking.includes('WHERE user_id=$1 AND language_code=$2'));
  assert.ok(studyTools.includes('learnerSnapshot(req.user.id,req.studyLanguageCode)'));
  assert.ok(studyTools.includes('WHERE user_id=$1 AND language_code=$2'));
  assert.ok(db.includes('INSERT INTO daily_activity'));
  assert.ok(db.includes('ON CONFLICT (user_id, language_code, activity_date)'));
});

test('AI practice local history is separated by study language and preserves legacy English history', () => {
  const practice = read('public/ai-practice.js');
  assert.ok(practice.includes('let activeStudyLanguageCode = \'en\''));
  assert.ok(practice.includes('byLanguage[activeStudyLanguageCode] = next'));
  assert.ok(practice.includes("activeStudyLanguageCode === 'en' ? value.slice(0, 8) : []"));
  assert.ok(practice.includes("fetch('/api/learning/languages'"));
});

test('switching target languages restores each language profile settings', () => {
  const route = read('src/routes/learning.js');
  const updates = route.match(/active_learning_language_code=\$2,[\s\S]{0,260}onboarding_completed_at=llp\.onboarding_completed_at/g) || [];
  assert.ok(updates.length >= 2, 'both enroll and activate should restore the selected language profile');
});
