CREATE TABLE IF NOT EXISTS knowledge_note_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('grammar','vocabulary','reading','listening','speaking','writing')),
  level TEXT NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  first_opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  last_score NUMERIC(5,2) CHECK (last_score IS NULL OR last_score BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, note_id)
);
CREATE INDEX IF NOT EXISTS knowledge_note_favorites_idx
  ON knowledge_note_progress(user_id, is_favorite, updated_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_note_recent_idx
  ON knowledge_note_progress(user_id, last_opened_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_collections_user_name_idx
  ON knowledge_collections(user_id, LOWER(name));
CREATE INDEX IF NOT EXISTS knowledge_collections_user_idx
  ON knowledge_collections(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_collection_notes (
  collection_id UUID NOT NULL REFERENCES knowledge_collections(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection_id, note_id)
);
CREATE INDEX IF NOT EXISTS knowledge_collection_notes_position_idx
  ON knowledge_collection_notes(collection_id, position, added_at);

CREATE TABLE IF NOT EXISTS knowledge_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('grammar','vocabulary','reading','listening','speaking','writing')),
  level TEXT NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  correct_count SMALLINT NOT NULL,
  question_count SMALLINT NOT NULL,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS knowledge_quiz_user_created_idx
  ON knowledge_quiz_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_quiz_category_idx
  ON knowledge_quiz_attempts(user_id, category, created_at DESC);

CREATE TABLE IF NOT EXISTS learner_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  ipa TEXT NOT NULL DEFAULT '',
  translation TEXT NOT NULL DEFAULT '',
  definition TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS learner_vocabulary_user_word_idx
  ON learner_vocabulary(user_id, LOWER(word));
CREATE INDEX IF NOT EXISTS learner_vocabulary_recent_idx
  ON learner_vocabulary(user_id, created_at DESC);
