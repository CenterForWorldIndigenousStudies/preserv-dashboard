# Environment Variables

## Purpose

This document explains the environment variables used by the
`preserv-dashboard` Next.js app.

Use this file as the quick reference for what each variable does, when it is
required, and which parts of the app depend on it.

For deeper topic-specific details, see:

- [db/CONNECTING_TO_DB.md](./db/CONNECTING_TO_DB.md)
- [PIPELINE_TRIGGER_CALLBACK_ARCHITECTURE.md](./PIPELINE_TRIGGER_CALLBACK_ARCHITECTURE.md)
- [DEPLOYING_STORYBOOK.md](./DEPLOYING_STORYBOOK.md)

## Environment Files

Common local files in this repo:

- `.env` - local development values
- `.env.local.example` - example local configuration
- `.env.test` - test database configuration

.env.local.example is organized by functional section:

- database
- Storybook
- Google OAuth / Auth.js
- ingest integration

Do not commit real secrets.

## Database Variables

These variables are used by:

- [lib/db.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/lib/db.ts:1)
- [prisma.config.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/prisma.config.ts:1)
- integration test DB helpers

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DB_HOST` | Yes | `localhost` | MariaDB host for runtime, Prisma, and tests. |
| `DB_PORT` | Yes | `3306` | MariaDB port. |
| `DB_NAME` | Yes | `cwis_preservation` | Database name. In test runtime, the name must contain `test`. |
| `DB_USER` | Yes | `mariadb` | MariaDB username. |
| `DB_PASS` | Yes | `docker` | MariaDB password. |
| `DB_CONNECTION_LIMIT` | No | `2` locally, `10` in production runtime | Prisma MariaDB adapter pool size. |
| `DB_ACQUIRE_TIMEOUT_MS` | No | `30000` | Milliseconds to wait for a DB connection. |
| `DB_IDLE_TIMEOUT_MS` | No | `60000` | Milliseconds before idle DB connections are released. |

Notes:

- The app uses `DB_*` variables directly. It does not use a single
  `DATABASE_URL`.
- Test runtime includes a guard that refuses to run against a database whose
  name does not look like a test schema.

## Authentication Variables

These variables are used by:

- [auth.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/auth.ts:1)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `AUTH_GOOGLE_ID` | Yes | None | Google OAuth client ID for Auth.js sign-in. |
| `AUTH_GOOGLE_SECRET` | Yes | None | Google OAuth client secret for Auth.js sign-in. |
| `AUTH_URL` | Yes | None | Base app URL used by Auth.js callbacks and deployed environments. |
| `AUTH_SECRET` | Yes | None | Auth.js session and token signing secret. |
| `AUTH_BYPASS_TOKEN` | No | None | Debug-only server-side bypass token. When set to `dev-bypass`, authorization checks are bypassed. |

Notes:

- `AUTH_BYPASS_TOKEN` is only for debugging. Do not enable it in production.
- The dashboard currently allows authenticated users whose email ends with
  `@cwis.org` or `@gmail.com`, unless bypass mode is enabled.

## Storybook Variable

This variable is used by:

- [app/developers/storybook/[[...path]]/route.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/developers/storybook/[[...path]]/route.ts:1)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `STORYBOOK_URL` | Yes for Storybook proxy usage | None | Base URL for the separately deployed Storybook instance that the dashboard proxies. |

Notes:

- The dashboard throws if the Storybook proxy route is used without
  `STORYBOOK_URL`.
- For local development, this is usually `http://localhost:6006` or
  `http://127.0.0.1:6006`.

## Pipeline Trigger and Callback Variables

These variables are used by:

- [app/api/ingest/start/route.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/api/ingest/start/route.ts:1)
- [app/api/ingest/callback/route.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/api/ingest/callback/route.ts:1)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATA_INGESTER_BASE_URL` | Yes for ingest triggers | None | Base URL for the `preserv-data-ingester` app. The dashboard posts trigger requests to `${DATA_INGESTER_BASE_URL}/ingest`. |
| `DATA_INGESTER_TRIGGER_TOKEN` | Yes for ingest triggers | None | Bearer token used by the dashboard to authenticate server-to-server trigger requests into `preserv-data-ingester`. |
| `INGESTER_CALLBACK_TOKEN` | Yes for ingest triggers and callbacks | None | Shared bearer token used to authenticate `preserv-data-ingester` callback requests into the dashboard. |

Notes:

- The dashboard uses `DATA_INGESTER_TRIGGER_TOKEN` in the `Authorization`
  header when it calls `preserv-data-ingester`.
- The dashboard uses `INGESTER_CALLBACK_TOKEN` in two places:
  - it sends the token to `preserv-data-ingester` as part of the callback
    payload
  - it verifies the same token when the ingester calls back
- Future pipeline apps should use the same pattern, but with separate callback
  tokens per app and separate trigger tokens per app.

## Google Drive Ingest Browser Variables

These variables are used by:

- [lib/googleDrive.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/lib/googleDrive.ts:1)
- [app/api/ingest/folders/route.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/api/ingest/folders/route.ts:1)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Conditionally required | None | JSON-encoded Google service account credentials. Preferred for Vercel and other hosted deployments. |
| `GOOGLE_SERVICE_ACCOUNT_FILE` | Conditionally required | None | Filesystem path to a Google service account JSON file. Preferred for local file-based development. |
| `GOOGLE_INGEST_SOURCE_ROOT_FOLDER_IDS` | No | None | Optional top-level folder allowlist for the ingest folder browser. Accepts either a JSON array or comma-separated list. |

Credential resolution order:

1. `GOOGLE_SERVICE_ACCOUNT_JSON`
2. `GOOGLE_SERVICE_ACCOUNT_FILE`

Notes:

- At least one of `GOOGLE_SERVICE_ACCOUNT_JSON` or
  `GOOGLE_SERVICE_ACCOUNT_FILE` must be set if the ingest folder browser is
  used.
- In practice, you should choose one credential mode for a given environment,
  even though `.env.local.example` shows both forms for reference.
- `GOOGLE_SERVICE_ACCOUNT_JSON` should be used in Vercel.
- `GOOGLE_SERVICE_ACCOUNT_FILE` should be used in local environments where the
  credential file exists on disk.
- `GOOGLE_INGEST_SOURCE_ROOT_FOLDER_IDS` limits the root folders shown in the
  dashboard. If omitted, the browser falls back to the accessible folders
  visible to the service account.

## Framework and Test Runtime Variables

These variables are not project-specific secrets, but they do affect behavior:

| Variable | Set By | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Next.js / runtime | Used to distinguish production, development, and test behavior. Affects DB pool defaults and global Prisma reuse. |
| `VITEST` | Vitest | Used to detect test runtime in DB setup. |

You normally do not need to set these manually.

## Minimum Local Config

For ordinary local dashboard work, the minimum useful configuration is usually:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cwis_preservation
DB_USER=mariadb
DB_PASS=docker

AUTH_GOOGLE_ID=your-client-id
AUTH_GOOGLE_SECRET=your-client-secret
AUTH_URL=http://localhost:3000
AUTH_SECRET=replace-this-with-a-long-random-secret

STORYBOOK_URL=http://localhost:6006
```

If you also want the ingest page working locally, add:

```env
DATA_INGESTER_BASE_URL=http://localhost:8000
DATA_INGESTER_TRIGGER_TOKEN=replace-this-with-a-shared-secret
INGESTER_CALLBACK_TOKEN=replace-this-with-a-shared-secret
GOOGLE_SERVICE_ACCOUNT_FILE=/absolute/path/to/service_account.json
```

or:

```env
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"..."}'
```

Use one of those Google credential forms, not both.

## Vercel Notes

For Vercel deployments:

- set secrets in the Vercel environment variable UI
- prefer `GOOGLE_SERVICE_ACCOUNT_JSON` over `GOOGLE_SERVICE_ACCOUNT_FILE`
- set `AUTH_URL` to the deployed dashboard URL for that environment
- set `STORYBOOK_URL` to the matching Storybook deployment
- set `DATA_INGESTER_BASE_URL` to the deployed ingester URL
- set `DATA_INGESTER_TRIGGER_TOKEN` to the shared dashboard -> ingester bearer token

## Security Notes

- Never commit real values for secrets, passwords, callback tokens, or Google
  credentials.
- Rotate any credential that has been exposed outside trusted secret storage.
- Keep `AUTH_BYPASS_TOKEN` disabled in production.
