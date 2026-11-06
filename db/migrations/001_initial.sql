CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'admin')),
  age_band TEXT NOT NULL CHECK (age_band IN ('13_15', '16_17', '18_plus')),
  country_code CHAR(2) NOT NULL,
  guardian_email TEXT,
  email_verified_at TIMESTAMPTZ,
  guardian_consented_at TIMESTAMPTZ,
  account_status TEXT NOT NULL DEFAULT 'pending_verification'
    CHECK (account_status IN ('pending_verification', 'pending_guardian', 'active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (age_band = '18_plus' AND guardian_email IS NULL) OR
    (age_band <> '18_plus' AND guardian_email IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS email_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL CHECK (token_type IN ('email_verify', 'guardian_consent', 'password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS email_tokens_user_type_idx ON email_tokens(user_id, token_type);

CREATE TABLE IF NOT EXISTS learner_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_language TEXT NOT NULL DEFAULT 'ru' CHECK (preferred_language IN ('ru', 'en')),
  goal TEXT NOT NULL DEFAULT 'general',
  self_assessed_level TEXT,
  assessed_level TEXT,
  minutes_per_day SMALLINT NOT NULL DEFAULT 10 CHECK (minutes_per_day IN (5, 10, 15, 30)),
  duration_weeks SMALLINT NOT NULL DEFAULT 4 CHECK (duration_weeks IN (4, 8, 12)),
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS placement_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  correct_count SMALLINT NOT NULL,
  total_questions SMALLINT NOT NULL,
  estimated_level TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS placement_user_completed_idx ON placement_attempts(user_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS learning_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  level TEXT NOT NULL,
  duration_weeks SMALLINT NOT NULL DEFAULT 4,
  minutes_per_day SMALLINT NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  starts_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS learning_plans_user_status_idx ON learning_plans(user_id, status);

CREATE TABLE IF NOT EXISTS plan_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
  week_number SMALLINT NOT NULL,
  theme TEXT NOT NULL,
  objective TEXT NOT NULL,
  UNIQUE(plan_id, week_number)
);

CREATE TABLE IF NOT EXISTS plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES plan_weeks(id) ON DELETE CASCADE,
  day_index SMALLINT NOT NULL CHECK (day_index BETWEEN 1 AND 28),
  main_task_id TEXT,
  review_item_limit SMALLINT NOT NULL DEFAULT 5,
  mini_prompt TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  UNIQUE(plan_id, day_index)
);
CREATE INDEX IF NOT EXISTS plan_days_plan_idx ON plan_days(plan_id, day_index);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  skill TEXT NOT NULL CHECK (skill IN ('vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking', 'pronunciation', 'review')),
  level TEXT NOT NULL,
  objective TEXT NOT NULL,
  instructions JSONB NOT NULL,
  content JSONB NOT NULL,
  answer_key JSONB NOT NULL,
  explanation JSONB NOT NULL,
  estimated_time SMALLINT NOT NULL DEFAULT 5,
  tags TEXT[] NOT NULL DEFAULT '{}',
  prerequisites TEXT[] NOT NULL DEFAULT '{}',
  srs JSONB NOT NULL DEFAULT '{}'::jsonb,
  success_criteria TEXT NOT NULL DEFAULT 'Complete the task accurately.',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercise_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  exercise_version INTEGER NOT NULL,
  answer JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  time_spent_seconds INTEGER,
  feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS exercise_attempts_user_created_idx ON exercise_attempts(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS srs_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_ref TEXT NOT NULL,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT,
  interval_days INTEGER NOT NULL DEFAULT 1,
  repetitions INTEGER NOT NULL DEFAULT 0,
  ease_factor NUMERIC(3,2) NOT NULL DEFAULT 2.50,
  due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_rating TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_ref)
);
CREATE INDEX IF NOT EXISTS srs_due_idx ON srs_items(user_id, due_at);

CREATE TABLE IF NOT EXISTS error_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES exercise_attempts(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  incorrect_form TEXT NOT NULL,
  correction TEXT NOT NULL,
  explanation TEXT,
  occurrences INTEGER NOT NULL DEFAULT 1,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS error_journal_user_open_idx ON error_journal(user_id, resolved_at, updated_at DESC);

CREATE TABLE IF NOT EXISTS daily_activity (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id, activity_date)
);

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS consent_user_idx ON consent_records(user_id, accepted_at DESC);
