-- Country is no longer collected during registration.
-- Keep legacy columns and existing values, but allow NULL for new accounts.
ALTER TABLE users ALTER COLUMN country_code DROP NOT NULL;
ALTER TABLE registration_events ALTER COLUMN country_code DROP NOT NULL;
