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
  assert.ok(serviceWorker.includes("const CACHE='quiet-english-shell-v9'"));
  assert.ok(serviceWorker.includes('"/onboarding.html"'));
});


test('only supported study languages can reach language-specific generators', () => {
  const db = read('src/db.js');
  const learning = read('src/routes/learning.js');
  const writing = read('src/routes/writing.js');
  const studyTools = read('src/routes/study-tools.js');
  const pronunciation = read('src/routes/pronunciation.js');
  const server = read('server.js');

  assert.ok(db.includes('export function requireEnglishStudyLanguage'));
  assert.ok(db.includes('export function requireSpeechSupport'));
  assert.ok(writing.includes("req.studyLanguageCode === 'de'"));
  assert.ok(studyTools.includes('const LEVELS = [\'A1\',\'A2\',\'B1\',\'B2\',\'C1\',\'C2\']'));
  assert.ok(studyTools.includes('loadActiveStudyLanguage'));
  assert.ok(pronunciation.includes('loadActiveStudyLanguage, requireSpeechSupport'));
  assert.ok(server.includes("app.post('/api/practice/instant'"));
  assert.ok(server.includes("app.post('/api/practice/generate'"));
  assert.ok(server.includes("app.post('/api/speaking/generate'"));
  assert.ok(server.includes('requireSupportedTargetCourse(req, res)'));
  assert.ok(server.includes("!['en','de'].includes(code)"));
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


test('activity tracking keeps the originating study language even after a profile switch', () => {
  const db = read('src/db.js');
  const learning = read('src/routes/learning.js');
  const writing = read('src/routes/writing.js');
  const tools = read('src/routes/study-tools.js');
  const server = read('server.js');

  assert.ok(db.includes('languageCode = null'));
  assert.ok(db.includes('COALESCE($4, active_learning_language_code)'));
  assert.ok(learning.includes('languageCode: exercise.language_code'));
  assert.ok(writing.includes('languageCode:req.studyLanguageCode'));
  assert.ok(tools.includes('languageCode:found.rows[0].language_code'));
  assert.ok(server.includes('languageCode: session.languageCode'));
  assert.ok(learning.includes('AND language_code=(SELECT active_learning_language_code FROM learner_profiles WHERE user_id=$2)'));
});


test('German A1-A2 course remains available with its own 4-week curriculum and 28 published tasks', () => {
  const migration = read('db/migrations/014_german_a1_a2_course.sql');
  const learning = read('src/routes/learning.js');
  const ids = migration.match(/\('DE-A[12]-\d{2}'/g) || [];
  assert.equal(ids.length, 28);
  assert.ok(migration.includes("'german-a1-a2-4-week'"));
  assert.ok(migration.includes("'published','de',1"));
  assert.ok(migration.includes("course_status='available', speech_supported=TRUE"));
  assert.ok(migration.includes('mini_prompt_ru TEXT'));
  assert.ok(migration.includes('mini_prompt_en TEXT'));
  assert.ok(learning.includes('germanPlacementQuestions'));
  assert.ok(learning.includes('estimateGermanLevel(correct, answers)'));
  assert.ok(learning.includes('Предварительная оценка немецкого A1–C2'));
  assert.ok(learning.includes('germanMiniPrompts[profile.level]'));
});

test('German B1-C2 release includes four independent curricula and 112 published tasks', () => {
  const migration = read('db/migrations/015_german_b1_c2_course.sql');
  for (const level of ['B1','B2','C1','C2']) {
    const ids = migration.match(new RegExp("\\('DE-" + level + "-\\d{2}'", 'g')) || [];
    assert.equal(ids.length, 28, level + ' must have 28 exercises');
    assert.ok(migration.includes("'german-" + level.toLowerCase() + "-4-week'"));
    assert.ok(migration.includes("'" + level + "','" + level + "',4,10"));
  }
  assert.ok(migration.includes('content_version=2'));
  assert.equal((migration.match(/INSERT INTO plan_templates/g) || []).length, 1);
});

test('German placement and learning modules support the full CEFR range A1-C2', () => {
  const placement = read('src/content/placement.js');
  const learning = read('src/routes/learning.js');
  const practice = read('src/practice-generation.js');
  const speaking = read('src/speaking.js');
  const server = read('server.js');
  const writing = read('src/routes/writing.js');
  const listening = read('src/routes/study-tools.js');
  const pronunciationContent = read('public/pronunciation-content.js');

  assert.ok(placement.includes("id: 'DE-P30'"));
  assert.ok(placement.includes("'B1', 'B2', 'C1', 'C2'"));
  assert.ok(learning.includes("'C2':6"));
  assert.ok(learning.includes("'B1','B2','C1','C2'"));
  assert.ok(practice.includes("new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])"));
  assert.ok(speaking.includes("new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])"));
  assert.ok(!practice.includes("languageCode === 'de' && !['A1','A2'].includes(level)"));
  assert.ok(!speaking.includes("languageCode === 'de' && !['A1','A2'].includes(level)"));
  assert.ok(!writing.includes("!['A1','A2'].includes(level)"));
  assert.ok(!listening.includes("!['A1','A2'].includes(level)"));
  assert.ok(server.includes("C2: {"));
  assert.ok(server.includes("AND skill IN ('grammar','vocabulary','speaking')"));
  assert.ok(pronunciationContent.includes('de-c2-public-discourse'));
  assert.ok(read('public/practice.html').includes('value="C2"'));
  assert.ok(read('public/pronunciation.html').includes('value="C2"'));
});

test('German Speaking Lab uses a multilingual local model, German passages and Unicode tokenization', () => {
  const client = read('public/pronunciation.js');
  const content = read('public/pronunciation-content.js');
  const scoring = read('public/pronunciation-scoring.js');
  const storage = read('public/pronunciation-storage.js');
  const route = read('src/routes/pronunciation.js');

  assert.ok(client.includes("onnx-community/whisper-tiny"));
  assert.ok(client.includes("language: activeLanguageCode === 'de' ? 'german' : 'english'"));
  assert.ok(client.includes("utterance.lang = activeLanguageCode === 'de' ? 'de-DE' : 'en-US'"));
  assert.ok(content.includes('export const GERMAN_PASSAGES'));
  assert.ok(scoring.includes('\\p{L}'));
  assert.ok(storage.includes('byLanguage[languageCode]'));
  assert.ok(route.includes('onnx-community/whisper-tiny'));
});

test('German dictionary and AI Tutor use the active study language', () => {
  const dictionary = read('public/dictionary.js');
  const listeningTrainer = read('public/listening-trainer.js');
  const knowledge = read('src/routes/knowledge.js');
  const server = read('server.js');
  const learning = read('src/routes/learning.js');

  assert.ok(dictionary.includes("api/v2/entries/'+activeLanguageCode+'/"));
  assert.ok(dictionary.includes('/dictionary-enrich/'));
  assert.ok(listeningTrainer.includes("activeLanguageCode==='de'?'german':'english'"));
  assert.ok(knowledge.includes('req.studyLanguage.english_name'));
  assert.ok(knowledge.includes('translation_en'));
  assert.ok(server.includes('You are a kind, patient German tutor'));
  assert.ok(server.includes('buildCommandReply(req.session?.userId, command, languageCode)'));
  assert.ok(server.includes('buildLearnerContext(req.session?.userId, req.body?.context_ref, languageCode)'));
  assert.ok(learning.includes("'communication'"));
});

test('German listening materials are filtered separately from English resources', () => {
  const library = read('public/listening.js');
  const trainer = read('public/listening-trainer.js');

  assert.ok(library.includes('learngerman.dw.com'));
  assert.ok(library.includes('deutsch.vhs-lernportal.de'));
  assert.ok(library.includes('item.language === activeStudyLanguageCode'));
  assert.ok(trainer.includes("activeLanguageCode==='de'?'de-DE'"));
});
