CREATE TABLE IF NOT EXISTS skill_practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL CHECK (skill IN ('listening', 'writing', 'speaking')),
  task_id TEXT NOT NULL,
  score SMALLINT CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  word_count SMALLINT NOT NULL DEFAULT 0 CHECK (word_count BETWEEN 0 AND 500),
  duration_seconds SMALLINT NOT NULL DEFAULT 0 CHECK (duration_seconds BETWEEN 0 AND 1800),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS skill_practice_user_created_idx
  ON skill_practice_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS skill_practice_user_skill_idx
  ON skill_practice_attempts(user_id, skill, created_at DESC);
