CREATE TABLE IF NOT EXISTS pronunciation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference_text TEXT NOT NULL,
  recognized_text TEXT NOT NULL DEFAULT '',
  pron_score NUMERIC(5,2),
  accuracy_score NUMERIC(5,2),
  fluency_score NUMERIC(5,2),
  completeness_score NUMERIC(5,2),
  prosody_score NUMERIC(5,2),
  word_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pronunciation_attempts_user_date_idx
  ON pronunciation_attempts(user_id, created_at DESC);
