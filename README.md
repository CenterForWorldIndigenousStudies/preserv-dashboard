# Preservation Dashboard

## Overview

The Preservation Dashboard (`preserv-dashboard`) is the CWIS (Center for World Indigenous Studies) Preservation Next.js application for browsing, reviewing, and managing preservation data stored in the shared MariaDB database.

Dashboard development happens in this monorepo.
The separate public `preserv-dashboard` repository exists only as deployment output for Vercel.
See [deployment documentation](../../documentation/dashboard/DEPLOYMENT.md).

At a high level it:

- provides document browsing, detail, and review workflows
- authenticates users with Auth.js and Google OAuth
- uses MUI-based components and Storybook for UI development
- connects to the shared preservation database through Prisma
- launches document-processing batches and shows live pipeline status

## Prerequisites

Tools an engineer needs before working with this project:

- [Node.js](https://nodejs.org/) (see version in [`.tool-versions`](../../.tool-versions))
- `npm`
- MariaDB access for runtime and integration tests (see <https://github.com/jonryser/mariadb_docker>)
- Google OAuth credentials
- [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) (see version in [`.tool-versions`](../../.tool-versions))

If you want the document processing page working locally as well, you also need:

- access to a running [Preservation Pipeline](../../src/preserv_pipeline/)
- shared trigger and callback tokens
- Google Drive service account credentials for the folder browser

## Setup

1. Install the tool versions defined in [`.tool-versions`](../../.tool-versions). This repo is set up to work with [`asdf`](https://asdf-vm.com/), which supports Linux and macOS. On Windows, install matching versions through the appropriate Windows tooling.

   ```bash
   asdf install
   ```

2. Install dependencies.

   ```bash
   npm run deps:install:dashboard
   ```

3. Create a local environment file.

   ```bash
   cp app/dashboard/.env.example app/dashboard/.env
   ```

4. Update `app/dashboard/.env` with your database settings, Auth.js secrets, and any local pipeline integration settings you need.

See [documentation/dashboard/ENV_VARS.md](../../documentation/dashboard/ENV_VARS.md) for the full environment variable reference.

## Running

Start the local development environment:

```bash
npm run dev:dashboard
```

This starts:

- the Next.js app on `http://localhost:3000`
- the Storybook dev server on `http://localhost:6006`

The Next.js app uses webpack in local development so pipeline callback runs do
not depend on the current Turbopack path.

If you only want the Next.js app:

```bash
cd app/dashboard && npm run dev:next
```

## Testing

Run the full suite:

```bash
npm run test
```

Run unit tests only:

```bash
npm run test:unit:dashboard
```

Run integration tests only:

```bash
npm run test:integration:dashboard
```

Run Storybook tests only:

```bash
cd app/dashboard && npm run test:storybook
```

Integration tests require a reachable MariaDB test database.

## Linting

Run all linting checks:

```bash
npm run lint
```

Run TypeScript checks:

```bash
cd app/dashboard && npm run typecheck
```

Run project linting only:

```bash
npm run lint:dashboard
```

Run Markdown linting only:

```bash
npm run lint:markdown
```

## Documentation

Additional project documentation:

- [Documentation standards](../../documentation/standards/DOCUMENTATION_STANDARDS.md)
- [Documentation roles](../../documentation/standards/DOCUMENTATION_ROLES.md)
- [Environment variables](../../documentation/dashboard/ENV_VARS.md)
- [Deployment](../../documentation/dashboard/DEPLOYMENT.md)
- [Pipeline trigger and callback architecture](../../documentation/dashboard/PIPELINE_TRIGGER_CALLBACK_ARCHITECTURE.md)
- [Current pipeline initiation integration](../../documentation/dashboard/PIPELINE_INITIATION_INTEGRATION.md)
- [Shared contract adapters](../../documentation/common/CONTRACT_ADAPTERS.md)
- [Component architecture](../../documentation/dashboard/COMPONENT_ARCHITECTURE.md)
- [Dashboard styling guide](../../documentation/dashboard/STYLING_GUIDE.md)
- [Structural class naming](../../documentation/dashboard/styles/SEMANTIC_CLASSES.md)
- [Database connection guidance](../../documentation/dashboard/db/CONNECTING_TO_DB.md)
- [Database reference](../../documentation/db/PRESERVATION_DB.md)
- [Testing overview](../../documentation/dashboard/testing/TESTING.md)
- [AI assistant guidance](AGENTS.md)
