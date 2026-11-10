-- Multilingual course foundation.
-- Existing learner data is copied into an English course before course-scoped
-- foreign keys are introduced. No learner progress is deleted.

CREATE TABLE IF NOT EXISTS language_catalog (
  language_code TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  native_name TEXT NOT NULL,
  speech_locale TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'coming_soon', 'disabled')),
  sort_order SMALLINT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO language_catalog (language_code, name_en, native_name, speech_locale, status, sort_order)
VALUES
  ('en', 'English', 'English', 'en-GB', 'active', 1),
  ('de', 'German', 'Deutsch', 'de-DE', 'active', 2),
  ('es', 'Spanish', 'Español', 'es-ES', 'coming_soon', 3),
  ('fr', 'French', 'Français', 'fr-FR', 'coming_soon', 4)
ON CONFLICT (language_code) DO UPDATE
SET name_en = EXCLUDED.name_en,
    native_name = EXCLUDED.native_name,
    speech_locale = EXCLUDED.speech_locale,
    status = EXCLUDED.status,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

CREATE TABLE IF NOT EXISTS learner_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES language_catalog(language_code),
  goal TEXT NOT NULL DEFAULT 'general',
  self_assessed_level TEXT CHECK (self_assessed_level IS NULL OR self_assessed_level IN ('Pre-A1','A1','A2','B1','B2','C1','C2')),
  assessed_level TEXT CHECK (assessed_level IS NULL OR assessed_level IN ('Pre-A1','A1','A2','B1','B2','C1','C2')),
  minutes_per_day SMALLINT NOT NULL DEFAULT 10 CHECK (minutes_per_day IN (5,10,15,30)),
  duration_weeks SMALLINT NOT NULL DEFAULT 4 CHECK (duration_weeks IN (4,8,12)),
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  onboarding_completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, language_code),
  UNIQUE (user_id, id)
);

-- Every existing learner receives an English course with the current settings.
INSERT INTO learner_courses
  (user_id, language_code, goal, self_assessed_level, assessed_level,
   minutes_per_day, duration_weeks, interests, onboarding_completed_at)
SELECT user_id, 'en', goal, self_assessed_level, assessed_level,
       minutes_per_day, duration_weeks, interests, onboarding_completed_at
FROM learner_profiles
ON CONFLICT (user_id, language_code) DO NOTHING;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS active_learner_course_id UUID;

UPDATE users u
SET active_learner_course_id = c.id
FROM learner_courses c
WHERE c.user_id = u.id
  AND c.language_code = 'en'
  AND u.active_learner_course_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_active_learner_course_fk'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_active_learner_course_fk
      FOREIGN KEY (active_learner_course_id)
      REFERENCES learner_courses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add ownership-scoped course references and backfill legacy records to English.
ALTER TABLE placement_attempts ADD COLUMN IF NOT EXISTS learner_course_id UUID;
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS learner_course_id UUID;
ALTER TABLE exercise_attempts ADD COLUMN IF NOT EXISTS learner_course_id UUID;
ALTER TABLE srs_items ADD COLUMN IF NOT EXISTS learner_course_id UUID;
ALTER TABLE error_journal ADD COLUMN IF NOT EXISTS learner_course_id UUID;
ALTER TABLE daily_activity ADD COLUMN IF NOT EXISTS learner_course_id UUID;
ALTER TABLE skill_practice_attempts ADD COLUMN IF NOT EXISTS learner_course_id UUID;

UPDATE placement_attempts t SET learner_course_id = c.id
FROM learner_courses c
WHERE c.user_id = t.user_id AND c.language_code = 'en' AND t.learner_course_id IS NULL;

UPDATE learning_plans t SET learner_course_id = c.id
FROM learner_courses c
WHERE c.user_id = t.user_id AND c.language_code = 'en' AND t.learner_course_id IS NULL;

UPDATE exercise_attempts t SET learner_course_id = c.id
FROM learner_courses c
WHERE c.user_id = t.user_id AND c.language_code = 'en' AND t.learner_course_id IS NULL;

UPDATE srs_items t SET learner_course_id = c.id
FROM learner_courses c
WHERE c.user_id = t.user_id AND c.language_code = 'en' AND t.learner_course_id IS NULL;

UPDATE error_journal t SET learner_course_id = c.id
FROM learner_courses c
WHERE c.user_id = t.user_id AND c.language_code = 'en' AND t.learner_course_id IS NULL;

UPDATE daily_activity t SET learner_course_id = c.id
FROM learner_courses c
WHERE c.user_id = t.user_id AND c.language_code = 'en' AND t.learner_course_id IS NULL;

UPDATE skill_practice_attempts t SET learner_course_id = c.id
FROM learner_courses c
WHERE c.user_id = t.user_id AND c.language_code = 'en' AND t.learner_course_id IS NULL;

ALTER TABLE placement_attempts ALTER COLUMN learner_course_id SET NOT NULL;
ALTER TABLE learning_plans ALTER COLUMN learner_course_id SET NOT NULL;
ALTER TABLE exercise_attempts ALTER COLUMN learner_course_id SET NOT NULL;
ALTER TABLE srs_items ALTER COLUMN learner_course_id SET NOT NULL;
ALTER TABLE error_journal ALTER COLUMN learner_course_id SET NOT NULL;
ALTER TABLE daily_activity ALTER COLUMN learner_course_id SET NOT NULL;
ALTER TABLE skill_practice_attempts ALTER COLUMN learner_course_id SET NOT NULL;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'placement_attempts','learning_plans','exercise_attempts',
    'srs_items','error_journal','daily_activity','skill_practice_attempts'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (user_id, learner_course_id) REFERENCES learner_courses(user_id, id) ON DELETE CASCADE',
      table_name, table_name || '_user_course_fk'
    );
  END LOOP;
END $$;

-- Activity must be unique per course, not merely per account.
ALTER TABLE daily_activity DROP CONSTRAINT IF EXISTS daily_activity_pkey;
ALTER TABLE daily_activity
  ADD CONSTRAINT daily_activity_pkey PRIMARY KEY (user_id, learner_course_id, activity_date);

-- Review cards with the same item reference may now coexist across courses.
ALTER TABLE srs_items
  DROP CONSTRAINT IF EXISTS srs_items_user_id_item_type_item_ref_key;
ALTER TABLE srs_items
  ADD CONSTRAINT srs_items_user_course_item_unique
  UNIQUE (user_id, learner_course_id, item_type, item_ref);

CREATE INDEX IF NOT EXISTS learner_courses_user_status_idx
  ON learner_courses(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS placement_course_completed_idx
  ON placement_attempts(learner_course_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS plans_course_status_idx
  ON learning_plans(learner_course_id, status);
CREATE INDEX IF NOT EXISTS attempts_course_created_idx
  ON exercise_attempts(learner_course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS srs_course_due_idx
  ON srs_items(learner_course_id, due_at);
CREATE INDEX IF NOT EXISTS errors_course_open_idx
  ON error_journal(learner_course_id, resolved_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS activity_course_date_idx
  ON daily_activity(learner_course_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS skill_practice_course_created_idx
  ON skill_practice_attempts(learner_course_id, created_at DESC);

-- Keep content and course templates language-specific while retaining global IDs.
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS language_code TEXT NOT NULL DEFAULT 'en'
  REFERENCES language_catalog(language_code);
ALTER TABLE plan_templates
  ADD COLUMN IF NOT EXISTS language_code TEXT NOT NULL DEFAULT 'en'
  REFERENCES language_catalog(language_code);

CREATE INDEX IF NOT EXISTS exercises_language_skill_level_idx
  ON exercises(language_code, status, skill, level);
CREATE INDEX IF NOT EXISTS plan_templates_language_status_idx
  ON plan_templates(language_code, status, goal);

-- A course-specific dictionary. Terms are unique within a learner's language course.
CREATE TABLE IF NOT EXISTS learner_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learner_course_id UUID NOT NULL,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  translation TEXT,
  part_of_speech TEXT,
  grammatical_gender TEXT CHECK (grammatical_gender IS NULL OR grammatical_gender IN ('masculine','feminine','neuter')),
  plural_form TEXT,
  example_sentence TEXT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','exercise','ai')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT learner_vocabulary_user_course_fk
    FOREIGN KEY (user_id, learner_course_id)
    REFERENCES learner_courses(user_id, id) ON DELETE CASCADE,
  CONSTRAINT learner_vocabulary_term_unique
    UNIQUE (user_id, learner_course_id, normalized_term)
);
CREATE INDEX IF NOT EXISTS learner_vocabulary_course_created_idx
  ON learner_vocabulary(learner_course_id, created_at DESC);

-- Reusable skill tasks are stored as content, not embedded in browser code.
CREATE TABLE IF NOT EXISTS skill_practice_tasks (
  id TEXT PRIMARY KEY,
  language_code TEXT NOT NULL REFERENCES language_catalog(language_code),
  skill TEXT NOT NULL CHECK (skill IN ('listening','writing','speaking','pronunciation')),
  level TEXT NOT NULL CHECK (level IN ('Pre-A1','A1','A2','B1','B2','C1','C2')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_minutes SMALLINT NOT NULL DEFAULT 5 CHECK (duration_minutes BETWEEN 1 AND 30),
  content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (language_code, id)
);
CREATE INDEX IF NOT EXISTS skill_practice_tasks_language_skill_idx
  ON skill_practice_tasks(language_code, skill, level, status);

-- Backward-compatibility note: learner_profiles remains the account-level
-- locale/timezone record. Course-specific preferences now live in learner_courses.

-- German pronunciation tasks are stored as a separate practice skill.
ALTER TABLE skill_practice_attempts
  DROP CONSTRAINT IF EXISTS skill_practice_attempts_skill_check;
ALTER TABLE skill_practice_attempts
  ADD CONSTRAINT skill_practice_attempts_skill_check
  CHECK (skill IN ('listening','writing','speaking','pronunciation'));
