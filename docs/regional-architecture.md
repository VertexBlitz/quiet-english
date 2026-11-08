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

The browser still has separate third-party dependencies that require a regional decision before calling the Russian experience fully self-contained:

- `dictionaryapi.dev` receives dictionary lookup requests from the learner's browser;
- `jsdelivr.net` serves the Transformers.js runtime, and its model assets may be fetched from remote model repositories;
- audio references in the listening library point to external publishers (including British Council and ELLLO), and dictionary pronunciation audio can be served by a dictionary provider;
- the Cloudflare Turnstile browser script is loaded when a site key is configured.

The public pages no longer load Google Fonts. Before enabling the Russian user account flow, decide which of the remaining client-side resources can be self-hosted in the Russian region, which can be replaced by an approved regional service, and which should be disabled for Russian visitors. The current PR does not claim these browser dependencies have been localised.

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


## International pilot: adult-only launch

The first international pilot uses the European deployment in Frankfurt as its only application and database region. Public account creation is limited to adults aged 18 or older. Minor sign-up endpoints are denied unless both `REGISTRATION_MINORS_ENABLED=true` and `REGISTRATION_MINORS_LEGAL_APPROVED=true` are explicitly set after a separate country-specific review. These flags are intentionally absent/false by default. Enabling them is not a substitute for consent flows, age-appropriate notices, country-specific review, and operational verification.

The initial pilot allowlist is Germany (`DE`) and Italy (`IT`). During signup, the user must declare their current country of residence; the server accepts only these two ISO country codes and records the selection in the existing `users.country_code` and `registration_events.country_code` fields. This is a market eligibility declaration, not proof of physical location, residence, or citizenship. It does not prevent a person outside these countries from falsely selecting one of them. Do not describe it as geoblocking or as a nationality check. A stronger geographic restriction would require a trusted server-side geolocation signal (for example, an appropriately configured edge proxy); client-provided headers and form values alone are not trusted location evidence. Do not collect identity documents or citizenship data merely to strengthen this pilot gate without a separate necessity and privacy assessment.

The adult-only interface and API guard cover new account creation. They do not delete historical accounts or remove guardian withdrawal/deletion routes that may be needed to honor earlier commitments. Public registration remains blocked by the existing readiness flags until all required launch checks have been completed.


### Germany and Italy launch review

Before registration is enabled, the adult operator and a qualified EU privacy adviser should complete a market-specific review:

- GDPR territorial scope applies to services offered to people in the EU by a controller outside the EU. Assess and document the Article 27 requirement for an EU representative; do not assume the occasional-processing exception applies to an ongoing account and learning-history service.
- Review every processor and subprocessor, data location, support/admin access, retention, deletion, and the legal mechanism for any transfer outside the EEA. Frankfurt hosting alone does not resolve every transfer question.
- For Germany, confirm whether the service falls within the DDG provider-information / legal-notice rules and any additional media-state requirements that apply to the actual service model.
- For Germany and Italy, audit browser storage, cookies, analytics, fingerprinting, and third-party scripts. Keep non-essential tracking disabled until valid consent is obtained where required. Italy's Garante has issued specific cookie and tracking guidance; Germany's TDDDG §25 governs storage/access on end-user devices.
- Provide final, reviewed notices and contractual terms appropriate for these countries. Current policy pages remain drafts and must not be treated as launch approval.

The current country selector is self-declared and the UI is currently available in Russian and English only; German and Italian translations have not yet been implemented.
