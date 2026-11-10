-- Multi-language learning foundation.
-- Existing learner data remains attached to English during migration.

CREATE TABLE IF NOT EXISTS study_languages (
  language_code CHAR(2) PRIMARY KEY,
  english_name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  locale TEXT NOT NULL,
  text_direction TEXT NOT NULL DEFAULT 'ltr' CHECK (text_direction IN ('ltr','rtl')),
  course_status TEXT NOT NULL DEFAULT 'planned'
    CHECK (course_status IN ('available','planned','disabled')),
  speech_supported BOOLEAN NOT NULL DEFAULT FALSE,
  content_version INTEGER NOT NULL DEFAULT 0,
  sort_order SMALLINT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO study_languages
  (language_code, english_name, native_name, locale, course_status, speech_supported, content_version, sort_order)
VALUES
  ('en', 'English', 'English', 'en-US', 'available', TRUE, 1, 1),
  ('de', 'German', 'Deutsch', 'de-DE', 'planned', FALSE, 0, 2),
  ('es', 'Spanish', 'Español', 'es-ES', 'planned', FALSE, 0, 3),
  ('fr', 'French', 'Français', 'fr-FR', 'planned', FALSE, 0, 4),
  ('it', 'Italian', 'Italiano', 'it-IT', 'planned', FALSE, 0, 5),
  ('pt', 'Portuguese', 'Português', 'pt-PT', 'planned', FALSE, 0, 6),
  ('pl', 'Polish', 'Polski', 'pl-PL', 'planned', FALSE, 0, 7),
  ('ja', 'Japanese', '日本語', 'ja-JP', 'planned', FALSE, 0, 8)
ON CONFLICT (language_code) DO UPDATE SET
  english_name = EXCLUDED.english_name,
  native_name = EXCLUDED.native_name,
  locale = EXCLUDED.locale,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

ALTER TABLE learner_profiles
  ADD COLUMN IF NOT EXISTS active_learning_language_code CHAR(2) NOT NULL DEFAULT 'en';

ALTER TABLE learner_profiles
  DROP CONSTRAINT IF EXISTS learner_profiles_active_learning_language_code_fkey;
ALTER TABLE learner_profiles
  ADD CONSTRAINT learner_profiles_active_learning_language_code_fkey
  FOREIGN KEY (active_learning_language_code) REFERENCES study_languages(language_code);

CREATE TABLE IF NOT EXISTS learner_language_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language_code CHAR(2) NOT NULL REFERENCES study_languages(language_code),
  goal TEXT NOT NULL DEFAULT 'general',
  self_assessed_level TEXT,
  assessed_level TEXT,
  minutes_per_day SMALLINT NOT NULL DEFAULT 10 CHECK (minutes_per_day IN (5, 10, 15, 30)),
  duration_weeks SMALLINT NOT NULL DEFAULT 4 CHECK (duration_weeks IN (4, 8, 12)),
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  learning_status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (learning_status IN ('not_started','in_progress','paused','completed')),
  onboarding_completed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_studied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, language_code)
);

-- Preserve the existing English learner profile as the first language profile.
INSERT INTO learner_language_profiles
  (user_id, language_code, goal, self_assessed_level, assessed_level,
   minutes_per_day, duration_weeks, interests, learning_status, onboarding_completed_at, last_studied_at)
SELECT user_id, 'en', goal, self_assessed_level, assessed_level,
       minutes_per_day, duration_weeks, interests,
       CASE WHEN onboarding_completed_at IS NULL THEN 'not_started' ELSE 'in_progress' END,
       onboarding_completed_at,
       CASE WHEN onboarding_completed_at IS NULL THEN NULL ELSE updated_at END
FROM learner_profiles
ON CONFLICT (user_id, language_code) DO NOTHING;

-- Every learning artifact receives a target-language key. Existing rows are English.
ALTER TABLE placement_attempts ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE plan_templates ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE exercise_attempts ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE srs_items ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE error_journal ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE daily_activity ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE knowledge_note_progress ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE knowledge_quiz_attempts ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE learner_vocabulary ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE writing_submissions ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE listening_quiz_sessions ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE listening_attempts ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE pronunciation_attempts ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE study_calendar_events ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE learner_coach_reports ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';
ALTER TABLE learner_focus_tasks ADD COLUMN IF NOT EXISTS language_code CHAR(2) NOT NULL DEFAULT 'en';

-- Recover the language for related historical rows before making language-aware keys.
UPDATE exercise_attempts a
SET language_code = e.language_code
FROM exercises e
WHERE a.exercise_id = e.id AND a.language_code = 'en' AND e.language_code <> 'en';

UPDATE error_journal j
SET language_code = a.language_code
FROM exercise_attempts a
WHERE j.attempt_id = a.id AND j.language_code = 'en' AND a.language_code <> 'en';

UPDATE learner_focus_tasks t
SET language_code = r.language_code
FROM learner_coach_reports r
WHERE t.report_id = r.id AND t.language_code = 'en' AND r.language_code <> 'en';

-- A daily activity row and a saved note can now exist independently per language.
ALTER TABLE daily_activity DROP CONSTRAINT IF EXISTS daily_activity_pkey;
ALTER TABLE daily_activity
  ADD CONSTRAINT daily_activity_pkey PRIMARY KEY (user_id, language_code, activity_date);

ALTER TABLE knowledge_note_progress DROP CONSTRAINT IF EXISTS knowledge_note_progress_pkey;
ALTER TABLE knowledge_note_progress
  ADD CONSTRAINT knowledge_note_progress_pkey PRIMARY KEY (user_id, language_code, note_id);

-- Vocab and review uniqueness are per language, not global per account.
ALTER TABLE srs_items DROP CONSTRAINT IF EXISTS srs_items_user_id_item_type_item_ref_key;
ALTER TABLE srs_items
  ADD CONSTRAINT srs_items_user_language_item_unique
  UNIQUE (user_id, language_code, item_type, item_ref);

DROP INDEX IF EXISTS learner_vocabulary_user_word_idx;
CREATE UNIQUE INDEX learner_vocabulary_user_language_word_idx
  ON learner_vocabulary(user_id, language_code, LOWER(word));

DROP INDEX IF EXISTS knowledge_collections_user_name_idx;
CREATE UNIQUE INDEX knowledge_collections_user_language_name_idx
  ON knowledge_collections(user_id, language_code, LOWER(name));

CREATE UNIQUE INDEX IF NOT EXISTS exercises_language_id_unique
  ON exercises(language_code, id);

CREATE INDEX IF NOT EXISTS learning_plans_user_language_status_idx
  ON learning_plans(user_id, language_code, status, created_at DESC);
CREATE INDEX IF NOT EXISTS placement_attempts_user_language_completed_idx
  ON placement_attempts(user_id, language_code, completed_at DESC);
CREATE INDEX IF NOT EXISTS exercise_attempts_user_language_created_idx
  ON exercise_attempts(user_id, language_code, created_at DESC);
CREATE INDEX IF NOT EXISTS srs_items_user_language_due_idx
  ON srs_items(user_id, language_code, due_at);
CREATE INDEX IF NOT EXISTS error_journal_user_language_open_idx
  ON error_journal(user_id, language_code, resolved_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS daily_activity_user_language_date_idx
  ON daily_activity(user_id, language_code, activity_date DESC);
CREATE INDEX IF NOT EXISTS learner_vocabulary_user_language_recent_idx
  ON learner_vocabulary(user_id, language_code, created_at DESC);
CREATE INDEX IF NOT EXISTS writing_submissions_user_language_created_idx
  ON writing_submissions(user_id, language_code, created_at DESC);
CREATE INDEX IF NOT EXISTS listening_attempts_user_language_created_idx
  ON listening_attempts(user_id, language_code, created_at DESC);
CREATE INDEX IF NOT EXISTS pronunciation_attempts_user_language_date_idx
  ON pronunciation_attempts(user_id, language_code, created_at DESC);
CREATE INDEX IF NOT EXISTS study_calendar_events_user_language_start_idx
  ON study_calendar_events(user_id, language_code, starts_at);
CREATE INDEX IF NOT EXISTS learner_coach_reports_user_language_created_idx
  ON learner_coach_reports(user_id, language_code, created_at DESC);

-- Validate language references for every language-scoped table.
DO $$
DECLARE
  table_name TEXT;
  constraint_name TEXT;
  scoped_tables TEXT[] := ARRAY[
    'placement_attempts','learning_plans','plan_templates','exercises','exercise_attempts',
    'srs_items','error_journal','daily_activity','knowledge_note_progress','knowledge_collections',
    'knowledge_quiz_attempts','learner_vocabulary','writing_submissions','listening_quiz_sessions',
    'listening_attempts','pronunciation_attempts','study_calendar_events','learner_coach_reports',
    'learner_focus_tasks'
  ];
BEGIN
  FOREACH table_name IN ARRAY scoped_tables LOOP
    constraint_name := table_name || '_language_code_fkey';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = constraint_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (language_code) REFERENCES study_languages(language_code)',
        table_name, constraint_name
      );
    END IF;
  END LOOP;
END $$;
