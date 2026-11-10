# Quiet English 2.0

A bilingual (Russian/English) personal English-learning platform built on the existing static frontend and Express API. The original AI chat contract remains compatible.

## Stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js 24, Express 5
- Data: PostgreSQL
- Sessions: express-session + connect-pg-simple
- Password hashing: Argon2id
- AI: Cloudflare Workers AI (Gemma 4)
- Email: Resend HTTPS API
- Hosting: Render

## Current MVP scope

- Account registration, email verification, sign-in, password reset
- Separate parent/guardian email attestation flow for minors
- Onboarding with learning goal, self-assessed level, interests, daily time and timezone
- Preliminary CEFR placement test (not an official certificate)
- Four-week personal plan with local-time daily tasks
- 20 curated vocabulary, grammar and reading exercises
- Server-side answer checking
- Spaced repetition queue
- Personal progress and error journal
- Data export and account deletion
- Simple admin CMS for exercise and four-week plan templates
- RU/EN language switch
- Existing AI tutor with optional account-derived context and slash commands

Listening media, structured writing assessment, voice recording, ASR, pronunciation scoring, advanced CMS workflows and formal exam preparation are out of this MVP.

## Important rollout and safety gates

**Account registration is disabled by default.** Do not enable it until a persistent PostgreSQL database, email sender, final privacy notice, Terms and age/guardian workflow have been reviewed and configured.

- `REGISTRATION_ENABLED=false` by default.
- `MINOR_SIGNUP_ENABLED=false` by default.
- The parent/guardian link in this MVP is an email-based attestation prototype. It is not independent identity verification and is not a substitute for jurisdiction-specific legal review or a production-grade consent process.
- The Terms and Privacy pages are drafts. They must be reviewed and completed by the service operator before public account registration.
- The admin CMS is available only to users whose database role is `admin`. That role must be assigned manually to a trusted adult operator after their account is verified. Do not make a learner account an administrator.

## Required Render environment variables

Set these in Render → Environment. Never commit real values:

- `DATABASE_URL` — persistent PostgreSQL connection string
- `SESSION_SECRET` — random secret with at least 32 characters
- `APP_BASE_URL` — canonical public site origin, e.g. `https://quiet-english-tutor.onrender.com`
- `RESEND_API_KEY` — email API key
- `EMAIL_FROM` — sender address verified with the email provider
- `REGISTRATION_ENABLED` — keep `false` until launch checks are complete
- `MINOR_SIGNUP_ENABLED` — keep `false` until the minors/guardian process has been reviewed
- `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` — existing AI integration
- `NODE_ENV=production` — secure production cookies
- `PGSSLMODE=require` if your PostgreSQL provider requires verified TLS; use `disable` only for a trusted local development database

A temporary database that expires or deletes data should not be used for learner accounts. Choose persistent PostgreSQL with backups before inviting users.

## Database setup

After supplying `DATABASE_URL`:

1. Run `npm install`.
2. Run `npm run migrate`. This applies ordered SQL files in `db/migrations` and records them in `schema_migrations`.
3. Run `npm run seed` to load the 20 curated exercises.
4. Verify `GET /api/health` reports `learningConfigured: true`.

Take a backup before running migrations against any database with existing data.

## Email setup

Registration and password recovery send messages through the Resend HTTPS API. Configure a verified sender domain and test:

- adult email verification;
- parent/guardian email attestation;
- password reset;
- expired or already-used tokens.

Do not enable registration until both email delivery and the applicable user-age process have been reviewed.

## First administrator

After an adult operator account has been legitimately registered and verified, assign the CMS role from a trusted database console:

```sql
UPDATE users
SET role = 'admin'
WHERE LOWER(email) = LOWER('trusted-operator@example.com')
  AND account_status = 'active';
```

Replace the example email with the trusted adult operator's own verified address. Never promote a learner account.

## Main pages

- `/` — landing page
- `/register.html` — registration (feature flag gated)
- `/login.html` — sign-in
- `/account.html` — profile, export and account deletion
- `/onboarding.html` — learning preferences
- `/placement.html` — preliminary CEFR placement
- `/plan.html` — four-week plan and Today
- `/practice.html` — vocabulary, grammar and reading practice
- `/exercise.html?id=G01` — exercise player
- `/review.html` — spaced repetition
- `/progress.html` — personal progress
- `/errors.html` — personal error journal
- `/tutor.html` — existing AI tutor
- `/admin.html` — admin-only CMS

## API compatibility

The existing `POST /api/chat` contract remains `{ messages: [...] }` → `{ message: string }`. An optional `context_ref` lets the server load user-owned exercise and learning context. The original route remains available when PostgreSQL is not configured.

New route groups:

- `/api/auth` — registration, sign-in, email verification, guardian attestation, password reset, data export and account deletion
- `/api/learning` — onboarding, placement, plan, exercises, attempts, review, progress and errors
- `/api/admin` — admin-only exercise and plan-template management

CMS changes to a published template affect newly generated plans. Existing learner plans keep their copied weekly themes and daily task assignments.

## Tests

- `npm run check` — syntax-checks server, client, scripts and test JavaScript; parses exercise seed JSON.
- `npm test` — runs unit tests for preliminary CEFR placement and hiding answer keys from public questions.
- GitHub Actions runs these checks for the feature branch and pull requests to main.

## Deployment notes

This work is developed in `quiet-english-2-mvp`, not deployed to the existing production Render service. The production site remains unchanged until the pull request is reviewed and merged.

After merging, the site can serve the new pages, but account and learning APIs remain disabled until the required database and session settings exist. Email registration additionally requires the Resend settings. Keep the registration feature flags off until the safety and privacy review is complete.


## Multilingual courses (development branch)

The multilingual course model keeps one account and separates learning data by course:

- `language_catalog` defines available and coming-soon languages.
- `learner_courses` stores one course per user and language.
- Existing learner data is migrated into an English course.
- Plans, placement attempts, exercise attempts, spaced repetition, errors, activity and skill practice are scoped to `learner_course_id`.
- English and German have independent placement content, exercise catalogs and four-week plan templates.
- The personal vocabulary is course-specific; German entries support grammatical gender and plural forms.
- Guest demo data is kept separately per language in browser storage.

German is enabled as the second course. Spanish and French remain marked as coming soon.

To prepare the multilingual database on a development database only:

1. Back up the database.
2. Run `npm run migrate` to apply migration `011_multilingual_courses.sql`.
3. Run `npm run seed` to load the curated German exercises and German plan templates.
4. Run `npm run check` and `npm test`.

Do not run the migration or seed command against the preview database until its Render service and database are positively identified.
