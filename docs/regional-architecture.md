# Regional deployment foundation

## Purpose

This change prepares Quiet English to run as two independent deployments:

- `ru`: application and PostgreSQL physically hosted in Russia;
- `eu`: application and PostgreSQL hosted in the selected European region.

The same repository revision is deployed to both. Public static assets are built from the same source revision, so the public lesson files and interface remain aligned. Account records, authentication sessions, learner profiles, learning plans, progress, drafts, and other user-specific records remain in the database attached to the selected regional deployment.

This is a deployment foundation, not a completed regional launch. It does not provision a Russian server, register a domain, migrate a database, choose local service providers, or approve legal requirements.

## Why the application is deployed twice

The current application uses one `DATABASE_URL` for accounts, PostgreSQL-backed sessions, learning progress, and other private records. It is not a multi-tenant regional router. The safe initial model is two isolated instances of the same application release, each with a physically separate PostgreSQL database:

| Setting | Russian instance | European instance |
|---|---|---|
| `APP_REGION` | `ru` | `eu` |
| `DB_SCHEMA` | `quiet_english_ru` | `quiet_english_eu` |
| `REGISTRATION_REQUIRED_DB_SCHEMA` | `quiet_english_ru` | `quiet_english_eu` |
| `DATABASE_URL` | Russian PostgreSQL only | European PostgreSQL only |
| `APP_BASE_URL` | Russian app origin | European app origin |

The schema name is an additional guard; it does not prove physical data residency. The operator must verify the database host, backups, logs, snapshots, and provider region. `REGISTRATION_DATABASE_ISOLATED=true` is an operator assertion and must only be set after this verification.

## Shared learning content

The same version of the repository's static files and built-in learning material is deployed to both instances. That gives both regions the same public interface and the same static lesson assets without sending learner data between regions.

Some published exercises and plan templates are stored in PostgreSQL and can be changed through the admin editor. Those records are not yet backed by one cross-region content source. Until a separate content publishing workflow is implemented, publish matching content changes to both regional databases from the same reviewed release; do not connect Russian learner requests to the European database to fetch content.

## Russian deployment template

The repository includes:

- `Dockerfile` — production Node.js image;
- `docker-compose.ru.yml` — app, private PostgreSQL 18 container, and Caddy HTTPS reverse proxy;
- `Caddyfile` — TLS reverse proxy;
- `.env.ru.example` — placeholder configuration.

A Russian VPS or dedicated server is still required. The database port is not published to the internet. PostgreSQL uses a persistent Docker volume. Backups must be configured separately and stored in a verified Russian region.

Initial deployment:

1. Provision a server in a verified Russian data centre under the adult operator's account.
2. Point a domain controlled by the operator to that server.
3. Install Docker Engine and the Compose plugin.
4. Copy `.env.ru.example` to `.env.ru`; fill in the domain, ACME email, and random secrets.
5. Keep all registration and external-processor flags set to `false`.
6. Run `docker compose --env-file .env.ru -f docker-compose.ru.yml up -d --build`.
7. Verify `/healthz`, `/readyz`, and `/api/region`; inspect migrations and logs.
8. Configure encrypted, restorable backups in a Russian region before any real learner data is stored.

Example secret generation:

- `openssl rand -hex 32` for `POSTGRES_PASSWORD`;
- `openssl rand -base64 48` for `SESSION_SECRET`.

Do not use the example values in a live deployment.

## External processors — Russian instance

The present codebase contains outbound integrations, including:

- Cloudflare Turnstile for registration CAPTCHA;
- Resend for verification and guardian emails;
- Cloudflare Workers AI for AI chat and AI-assisted learning/writing functions;
- YooKassa for payment processing.

A PostgreSQL move alone does not localise data sent to these services. The public HTML pages no longer request Google Fonts from Google's CDN; they use the browser's local sans-serif fallback instead. The Russian Docker template leaves the external API integrations unconfigured and keeps registration closed. The code also blocks Russian-region use of configured external personal-data processors unless `REGION_EXTERNAL_PROCESSORS_APPROVED=true` is explicitly set after a documented assessment.

Before enabling registration, the operator must select and test appropriate service providers, update the integration code where needed, review contracts and processing locations, and complete the applicable legal review. Do not set approval flags merely to make the health/readiness check green.

## Registration gates

Russian registration remains blocked until all of the following are genuinely complete:

- a physically Russian app and database host, including backups and logs;
- a separately reviewed processor list and compliant local alternatives where required;
- operator identity and contact details in the legal documents;
- legal review and any applicable regulator notification;
- working regional email and CAPTCHA integrations;
- tested adult and parent-first minor registration, email confirmation, withdrawal, and deletion flows.

The environment flags are controls, not legal conclusions.

## Migration and release safety

Do not copy production data to Preview. For a future Russian launch, use an empty dedicated Russian database unless a separate, approved migration plan exists. If records must be migrated, prepare a documented export/import, test it with non-production data, verify counts and integrity, and define a rollback. No Production service or `main` branch is changed by this preparation.
