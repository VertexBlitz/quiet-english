CREATE TABLE IF NOT EXISTS pronunciation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference_text TEXT NOT NULL,
  recognized_text TEXT NOT NULL DEFAULT '',
  word_match_score NUMERIC(5,2) NOT NULL,
  word_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pronunciation_attempts_user_date_idx
  ON pronunciation_attempts(user_id, created_at DESC);
