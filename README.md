# Preservation Dashboard

## Overview

The preservation Dashboard (`preserv-dashboard`) is the CWIS (Center for Wrold Indigenous Studies) Preservation Next.js application for
browsing, reviewing, and managing preservation data stored in the shared MariaDB database.

At a high level it:

- provides document browsing, detail, and review workflows
- authenticates users with Auth.js and Google OAuth
- uses MUI-based components and Storybook for UI development
- connects to the shared preservation database through Prisma
- launches document-processing batches and shows live pipeline status

## Prerequisites

Tools an engineer needs before working with this project:

- [Node.js](https://nodejs.org/) (see version in [`.tool-versions`](.tool-versions))
- `npm`
- MariaDB access for runtime and integration tests (see <https://github.com/jonryser/mariadb_docker>)
- Google OAuth credentials
- [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) (see version in [`.tool-versions`](.tool-versions))

If you want the document processing page working locally as well, you also need:

- access to a running [Preservation Pipeline](../../src/preserv_pipeline/)
- shared trigger and callback tokens
- Google Drive service account credentials for the folder browser

## Setup

1. Install the tool versions defined in `.tool-versions`.
    __NOTE__ this repo is set up to work with [`asdf`](https://asdf-vm.com/)
    `asdf` supports Linux and MacOs.
    If you are on Windows, please install these versions via the appropriate Windows solution.

   (Linux & Mac)

   ```bash
   asdf install
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Create a local environment file.

   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your database settings, Auth.js secrets, and any local pipeline integration settings you need.

See [documentation/dashboard/ENV_VARS.md](../../documentation/dashboard/ENV_VARS.md) for the full environment variable reference.

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

- [Environment variables](../../documentation/dashboard/ENV_VARS.md)
- [Pipeline trigger and callback architecture](../../documentation/dashboard/PIPELINE_TRIGGER_CALLBACK_ARCHITECTURE.md)
- [Current process-page integration](../../documentation/dashboard/PIPELINE_INGEST_INTEGRATION.md)
- [Component architecture](../../documentation/dashboard/COMPONENT_ARCHITECTURE.md)
- [Semantic CSS](../../documentation/dashboard/styles/SEMANTIC_CLASSES.md)
- [Storybook deployment](../../documentation/dashboard/DEPLOYING_STORYBOOK.md)
- [Database connection guidance](../../documentation/dashboard/db/CONNECTING_TO_DB.md)
- [Database reference](../../documentation/dashboard/db/PRESERVATION_DB.md)
- [Testing overview](../../documentation/dashboard/testing/TESTING.md)
- [AI assistant guidance](AGENTS.md)
