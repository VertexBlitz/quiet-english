# Quiet English 2.0

A bilingual (RU/EN) personal English-learning platform built on the existing static frontend and Express API. The original AI chat endpoint remains compatible.

## Current stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js 24, Express 5
- Data: PostgreSQL
- Sessions: express-session + connect-pg-simple
- Password hashing: Argon2id
- AI: Cloudflare Workers AI (Gemma 4)
- Email verification: Resend HTTPS API
- Hosting: Render

## Important rollout guard

Account registration is disabled by default. Do not set `REGISTRATION_ENABLED=true` until a persistent database, email sender, final privacy notice, Terms and age/guardian consent workflow have been reviewed and configured.

Registration for users under 18 has an additional guard: `MINOR_SIGNUP_ENABLED=false` by default. The current email attestation flow is a technical starting point, not a substitute for jurisdiction-specific legal review or a verified parental-consent process.

## Required environment variables

Set these in Render → Environment (never commit real values):

- `DATABASE_URL` — persistent PostgreSQL connection string
- `SESSION_SECRET` — random secret of at least 32 characters
- `APP_BASE_URL` — canonical public site origin, e.g. `https://quiet-english-tutor.onrender.com`
- `RESEND_API_KEY` — email API key
- `EMAIL_FROM` — sender address verified with the email provider
- `REGISTRATION_ENABLED` — keep `false` until launch checks are complete
- `MINOR_SIGNUP_ENABLED` — keep `false` until the minors/guardian process has been reviewed
- `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` — existing AI integration

A free temporary database should not be used for real learner progress. Choose persistent PostgreSQL with backups before inviting users.

## Database setup

After supplying `DATABASE_URL`:

1. Run `npm install`.
2. Run `npm run migrate` to create the schema.
3. Run `npm run seed` to load the curated starter exercises.
4. Verify `GET /api/health` reports `learningConfigured: true`.

Do not run migrations against a database containing valuable data without first taking a backup.

## Email setup

The registration and password-recovery routes send messages through the provider's HTTPS API. Configure a verified sender domain and test both the learner email-verification and parent/guardian-consent flows before enabling public registration.

## Main pages

- `/` — landing page
- `/register.html` — registration
- `/login.html` — sign-in
- `/onboarding.html` — learning preferences
- `/placement.html` — preliminary CEFR placement
- `/plan.html` — four-week plan and Today
- `/practice.html` — vocabulary, grammar and reading practice
- `/exercise.html?id=G01` — exercise player
- `/review.html` — spaced repetition
- `/progress.html` — personal progress
- `/errors.html` — error journal
- `/tutor.html` — existing AI tutor

## API compatibility

The existing `POST /api/chat` request shape remains `{ messages: [...] }` and the response remains `{ message: string }`. An optional `context_ref` adds server-loaded, user-owned learning context. The original route remains available if PostgreSQL is not configured.

New route groups:

- `/api/auth` — registration, login, email verification, guardian attestation, password reset
- `/api/learning` — onboarding, placement, plan, exercises, attempts, review, progress and errors

## Tests

- `npm run check` — syntax-checks JavaScript and parses the exercise seed data.
- `npm test` — runs the placement-level and public-question tests.

## Known MVP scope

The MVP includes Vocabulary, Grammar and Reading. Listening, writing, spoken audio, ASR, pronunciation assessment, advanced CMS workflows, data export and a production-grade age/guardian verification process remain follow-up work. The privacy and terms pages are drafts and require review before public registration is enabled.
