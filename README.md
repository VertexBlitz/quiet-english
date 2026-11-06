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
- Skills Lab with 12 original listening dialogues and comprehension questions
- Browser speech synthesis with selectable English voice, accent and playback speed
- Writing prompts with AI feedback and speaking prompts with a typed or browser-transcribed response
- Eight scripted pronunciation exercises with Azure Speech phoneme, word, fluency, completeness and prosody scoring when the operator enables the integration

The listening library uses the learner's device/browser speech synthesis rather than prerecorded studio audio. Pronunciation scoring is disabled until an adult service operator configures an Azure Speech resource and reviews the privacy and billing implications.

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
- `APP_BASE_URL` — canonical public site origin, e.g. `https://app.quietenglishcom.aclclouds.online`
- `RESEND_API_KEY` — email API key
- `EMAIL_FROM` — sender address verified with the email provider
- `REGISTRATION_ENABLED` — keep `false` until launch checks are complete
- `MINOR_SIGNUP_ENABLED` — keep `false` until the minors/guardian process has been reviewed
- `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` — existing AI integration
- `AZURE_SPEECH_ENABLED=true` — explicit switch to enable external pronunciation assessment after adult operator approval
- `AZURE_SPEECH_KEY` — Azure Speech resource key; store only in Render Environment, never in GitHub or chat
- `AZURE_SPEECH_REGION` — Azure Speech resource region, such as the region assigned to that resource
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
- `/skills.html` — listening, writing, speaking and pronunciation practice
- `/tutor.html` — existing AI tutor
- `/admin.html` — admin-only CMS

## API compatibility

The existing `POST /api/chat` contract remains `{ messages: [...] }` → `{ message: string }`. An optional `context_ref` lets the server load user-owned exercise and learning context. The original route remains available when PostgreSQL is not configured.

New route groups:

- `/api/auth` — registration, sign-in, email verification, guardian attestation, password reset, data export and account deletion
- `/api/learning` — onboarding, placement, plan, exercises, attempts, review, progress and errors
- `/api/admin` — admin-only exercise and plan-template management
- `/api/speech/pronunciation` — consent-based, fixed-text pronunciation assessment; WAV audio is processed in memory and forwarded to Azure only when enabled

CMS changes to a published template affect newly generated plans. Existing learner plans keep their copied weekly themes and daily task assignments.

## Tests

- `npm run check` — syntax-checks server, client, scripts and test JavaScript; parses exercise seed JSON.
- `npm test` — runs unit tests for preliminary CEFR placement, safe public exercises, and pronunciation audio/result validation.
- GitHub Actions runs these checks for the feature branch and pull requests to main.

## Pronunciation service setup

See [docs/azure-speech-pronunciation.md](docs/azure-speech-pronunciation.md) before enabling the feature. The server accepts only fixed practice-task IDs and mono PCM WAV at 16 kHz, enforces a short recording limit and a per-IP rate limit, and does not write audio to disk. The client asks for separate consent before sending a recording. The audio is processed by the configured Azure Speech resource, so an adult operator must review the applicable privacy notice and pricing before enabling it.

Keep `AZURE_SPEECH_ENABLED` unset or `false` until the resource, permissions and budget controls have been reviewed. Never send Azure keys through chat or commit them to the repository.

## Deployment notes

The `main` branch is connected to the Render web service and deploys automatically. Merge the feature pull request to publish these changes. Render runs `npm run check`, database migrations and seed updates during startup. Account registration remains disabled until a permanent database, email delivery and the age/guardian process have been reviewed.
