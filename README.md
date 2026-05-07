# preserv-dashboard

## Overview

`preserv-dashboard` is the CWIS Preservation Next.js application for browsing,
reviewing, and managing preservation data stored in the shared MariaDB
database.

At a high level it:

- provides document browsing, detail, and review workflows
- authenticates users with Auth.js and Google OAuth
- uses MUI-based components and Storybook for UI development
- connects to the shared preservation database through Prisma
- triggers pipeline work such as document ingest and shows live ingest status

## Prerequisites

Tools an engineer needs before working with this project:

- [Node.js](https://nodejs.org/) via `asdf` (see version in [`.tool-versions`](.tool-versions))
- `npm`
- MariaDB access for runtime and integration tests (see <https://github.com/jonryser/mariadb_docker>)
- Google OAuth credentials for Auth.js

If you want the ingest screen working locally as well, you also need:

- access to a running [`preserv-data-ingester`](https://github.com/CenterForWorldIndigenousStudies/preserv-data-ingester)
- shared trigger and callback tokens
- Google Drive service account credentials for the folder browser

## Setup

1. Install the tool versions defined in `.tool-versions`.

   ```bash
   asdf install
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Create a local environment file.

   ```bash
   cp .env.local.example .env
   ```

4. Update `.env` with your database settings, Auth.js secrets, and any local
   pipeline integration settings you need.

See [documentation/ENV_VARS.md](documentation/ENV_VARS.md) for the full
environment variable reference.

## Running

Start the local development environment:

```bash
npm run dev
```

This starts:

- the Next.js app on `http://localhost:3000`
- the Storybook dev server on `http://localhost:6006`

If you only want the Next.js app:

```bash
npm run dev:next
```

## Testing

Run the full suite:

```bash
npm run test
```

Run unit tests only:

```bash
npm run test:unit
```

Run integration tests only:

```bash
npm run test:integration
```

Run Storybook tests only:

```bash
npm run test:storybook
```

Integration tests require a reachable MariaDB test database.

## Linting

Run all linting checks:

```bash
npm run lint
```

Run TypeScript checks:

```bash
npm run typecheck
```

Run project linting only:

```bash
npm run lint:project
```

Run Markdown linting only:

```bash
npm run lint:markdown
```

## Documentation

Additional project documentation:

- [Environment variables](documentation/ENV_VARS.md)
- [Pipeline trigger and callback architecture](documentation/PIPELINE_TRIGGER_CALLBACK_ARCHITECTURE.md)
- [Component architecture](documentation/ComponentArchitecture.md)
- [Storybook deployment](documentation/DEPLOYING_STORYBOOK.md)
- [Database connection guidance](documentation/db/CONNECTING_TO_DB.md)
- [Database reference](documentation/db/PRESERVATION_DB.md)
- [Testing overview](documentation/testing/TESTING.md)
- [AI assistant guidance](AGENTS.md)
