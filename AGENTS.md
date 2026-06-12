# Preservation Dashboard

`preserv-dashboard` is the CWIS Preservation Next.js application for browsing, reviewing, and managing preservation data in the shared MariaDB database.

ALL CODE MUST BE IN ENGLISH

## Purpose

The dashboard is the operator-facing app for:

- authenticated document, review, and failure-management workflows
- shared MariaDB reads and writes through Prisma
- UI composition with MUI and Atomic Design layering
- pipeline initiation, callback handling, and live process monitoring

## Read First

Use the focused docs instead of growing this file:

- overview and setup: [README.md](./README.md)
- documentation standards: [../../documentation/standards/DOCUMENTATION_STANDARDS.md](../../documentation/standards/DOCUMENTATION_STANDARDS.md)
- documentation roles: [../../documentation/standards/DOCUMENTATION_ROLES.md](../../documentation/standards/DOCUMENTATION_ROLES.md)
- environment variables: [../../documentation/dashboard/ENV_VARS.md](../../documentation/dashboard/ENV_VARS.md)
- deployment: [../../documentation/dashboard/DEPLOYMENT.md](../../documentation/dashboard/DEPLOYMENT.md)
- component architecture: [../../documentation/dashboard/COMPONENT_ARCHITECTURE.md](../../documentation/dashboard/COMPONENT_ARCHITECTURE.md)
- semantic styling rules: [../../documentation/dashboard/styles/SEMANTIC_CLASSES.md](../../documentation/dashboard/styles/SEMANTIC_CLASSES.md)
- pipeline architecture: [../../documentation/dashboard/PIPELINE_TRIGGER_CALLBACK_ARCHITECTURE.md](../../documentation/dashboard/PIPELINE_TRIGGER_CALLBACK_ARCHITECTURE.md)
- current pipeline initiation integration: [../../documentation/dashboard/PIPELINE_INITIATION_INTEGRATION.md](../../documentation/dashboard/PIPELINE_INITIATION_INTEGRATION.md)
- database connection guidance: [../../documentation/dashboard/db/CONNECTING_TO_DB.md](../../documentation/dashboard/db/CONNECTING_TO_DB.md)
- database reference: [../../documentation/db/PRESERVATION_DB.md](../../documentation/db/PRESERVATION_DB.md)
- testing overview: [../../documentation/dashboard/testing/TESTING.md](../../documentation/dashboard/testing/TESTING.md)

## Where To Start In Code

Primary entry points:

- app routes and pages: `app/`
- authenticated API routes: `app/api/`
- auth configuration: `auth.ts`
- auth proxy boundary: `proxy.ts`
- database helpers and query logic: `lib/db.ts`, `lib/queries.ts`, `lib/`

Important UI areas:

- atoms: `components/atoms/`
- molecules: `components/molecules/`
- organisms: `components/organisms/`
- process-documents workflow: `components/organisms/ProcessDocumentsWorkspace.tsx`

Important pipeline integration areas:

- process routes: `app/api/process/`
- pipeline callback routes: `app/api/pipeline/`
- pipeline trigger orchestration: `lib/pipelineTriggers.ts`
- normalized pipeline state: `lib/pipelineNormalization.ts`
- process page UI: `app/process-documents/page.tsx`

## Local Guardrails

- keep components in the correct Atomic Design layer
- prefer existing atoms and molecules before creating new UI primitives
- use MUI components and theme-driven styling
- use semantic class names for structural and layout styling
- do not introduce ad hoc presentational class names or new styling patterns
- treat the shared preservation database schema as the external source of truth
- keep auth and session concerns in Auth.js and proxy configuration
- keep pipeline callback routes outside the Auth.js proxy when they are meant for server-to-server access
- prefer extending existing query helpers, components, and documentation over creating parallel patterns

## Validation

Run the smallest relevant checks for the files you touched:

```bash
npm run lint:markdown
npm run lint:dashboard
npm run test:unit:dashboard
```

Use these broader checks when appropriate:

```bash
npm run test:integration:dashboard
npm run build:dashboard
```

If you need the app-local TypeScript check:

```bash
cd app/dashboard && npm run typecheck
```
