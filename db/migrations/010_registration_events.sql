CREATE TABLE IF NOT EXISTS registration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('account_created', 'email_verified')),
  age_band TEXT NOT NULL CHECK (age_band IN ('13_15', '16_17', '18_plus')),
  country_code CHAR(2) NOT NULL,
  adult_attested BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_language TEXT NOT NULL CHECK (preferred_language IN ('ru', 'en')),
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS registration_events_created_idx
  ON registration_events(created_at DESC);
CREATE INDEX IF NOT EXISTS registration_events_user_idx
  ON registration_events(user_id, created_at DESC);
