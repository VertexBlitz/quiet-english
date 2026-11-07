ALTER TABLE learner_vocabulary
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'dictionary';

CREATE TABLE IF NOT EXISTS writing_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('essay','email','story','article','exam')),
  level TEXT NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  topic TEXT NOT NULL DEFAULT '',
  submitted_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL DEFAULT '',
  natural_version TEXT NOT NULL DEFAULT '',
  summary_ru TEXT NOT NULL DEFAULT '',
  grammar_score SMALLINT NOT NULL CHECK (grammar_score BETWEEN 0 AND 100),
  naturalness_score SMALLINT NOT NULL CHECK (naturalness_score BETWEEN 0 AND 100),
  vocabulary_score SMALLINT NOT NULL CHECK (vocabulary_score BETWEEN 0 AND 100),
  structure_score SMALLINT NOT NULL CHECK (structure_score BETWEEN 0 AND 100),
  overall_score SMALLINT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  repeated_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS writing_submissions_user_created_idx
  ON writing_submissions(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS listening_quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Listening practice',
  level TEXT NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  question_set JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS listening_quiz_sessions_user_idx
  ON listening_quiz_sessions(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS listening_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Listening practice',
  level TEXT NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  correct_count SMALLINT NOT NULL,
  question_count SMALLINT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS listening_attempts_user_created_idx
  ON listening_attempts(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS study_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL CHECK (event_type IN ('study','review','writing','listening','speaking','other')),
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes SMALLINT NOT NULL DEFAULT 20 CHECK (duration_minutes BETWEEN 5 AND 240),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS study_calendar_events_user_start_idx
  ON study_calendar_events(user_id,starts_at);

CREATE TABLE IF NOT EXISTS learner_coach_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'learning-patterns',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS learner_coach_reports_user_created_idx
  ON learner_coach_reports(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS learner_focus_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES learner_coach_reports(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  skill TEXT NOT NULL CHECK (skill IN ('grammar','vocabulary','reading','listening','speaking','writing','mixed')),
  topic TEXT NOT NULL DEFAULT '',
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_id,position)
);
CREATE INDEX IF NOT EXISTS learner_focus_tasks_user_due_idx
  ON learner_focus_tasks(user_id,completed_at,due_date);

INSERT INTO srs_items (user_id,item_type,item_ref,prompt,answer,explanation,due_at)
SELECT v.user_id,'vocabulary',v.id::text,v.word,
       COALESCE(NULLIF(v.translation,''),NULLIF(v.definition,''),'Review this word'),
       NULLIF(v.definition,''),v.created_at+INTERVAL '1 day'
FROM learner_vocabulary v
ON CONFLICT (user_id,item_type,item_ref) DO NOTHING;
