-- Versioned seed state for the six additional CEFR course banks.
-- Course rows are inserted transactionally by scripts/seed-multilingual-courses.js
-- after SQL migrations finish, before the Preview service starts.
CREATE TABLE IF NOT EXISTS language_course_seed_versions (
  language_code CHAR(2) PRIMARY KEY REFERENCES study_languages(language_code),
  content_version INTEGER NOT NULL DEFAULT 0 CHECK (content_version >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exercises_language_level_skill_status_idx
  ON exercises(language_code, level, skill, status);
