CREATE TABLE IF NOT EXISTS guardian_consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  guardian_email TEXT NOT NULL,
  age_band TEXT NOT NULL CHECK (age_band IN ('13_15', '16_17')),
  country_code CHAR(2) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consented_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guardian_consent_requests_expiry_idx
  ON guardian_consent_requests(expires_at);
CREATE INDEX IF NOT EXISTS users_guardian_email_idx
  ON users(LOWER(guardian_email))
  WHERE guardian_email IS NOT NULL;

ALTER TABLE registration_events
  DROP CONSTRAINT IF EXISTS registration_events_event_type_check;

ALTER TABLE registration_events
  ADD CONSTRAINT registration_events_event_type_check
  CHECK (event_type IN ('account_created', 'email_verified', 'guardian_consented'));

ALTER TABLE registration_events
  ADD COLUMN IF NOT EXISTS personal_data_consent_version TEXT;
