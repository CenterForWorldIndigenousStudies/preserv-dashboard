# Project

`preserv-dashboard` is the CWIS Preservation Next.js application for browsing,
reviewing, and managing preservation data in the shared MariaDB database.

At a high level it:

- renders authenticated document, review, and failure-management workflows
- uses Prisma against the shared `preserv-db` schema
- uses MUI-based components with Atomic Design organization
- proxies authenticated Storybook access
- integrates with external pipeline apps and can surface live status updates

## Read First

Use repo documentation for operational detail instead of expanding this file:

- overview and setup: [README.md](README.md)
- environment variables: [documentation/ENV_VARS.md](documentation/ENV_VARS.md)
- component architecture: [documentation/ComponentArchitecture.md](documentation/ComponentArchitecture.md)
- semantic styling rules: [documentation/styles/SEMANTIC_CLASSES.md](documentation/styles/SEMANTIC_CLASSES.md)
- pipeline architecture: [documentation/PIPELINE_TRIGGER_CALLBACK_ARCHITECTURE.md](documentation/PIPELINE_TRIGGER_CALLBACK_ARCHITECTURE.md)
- current ingest integration: [documentation/PIPELINE_INGEST_INTEGRATION.md](documentation/PIPELINE_INGEST_INTEGRATION.md)
- database connection guidance: [documentation/db/CONNECTING_TO_DB.md](documentation/db/CONNECTING_TO_DB.md)
- database reference: [documentation/db/PRESERVATION_DB.md](documentation/db/PRESERVATION_DB.md)
- testing overview: [documentation/testing/TESTING.md](documentation/testing/TESTING.md)
- Storybook deployment: [documentation/DEPLOYING_STORYBOOK.md](documentation/DEPLOYING_STORYBOOK.md)

## Where To Start In Code

Primary entrypoints:

- app routes and pages: `app/`
- authenticated API routes: `app/api/`
- auth configuration: `auth.ts`
- auth proxy boundary: `proxy.ts`
- database queries and helpers: `lib/queries.ts`, `lib/`

Important UI areas:

- atoms: `components/atoms/`
- molecules: `components/molecules/`
- organisms: `components/organisms/`

Important pipeline integration areas:

- shared route area: `app/api/`
- shared service helpers: `lib/`
- current ingest UI: `app/ingest-documents/page.tsx`
- current ingest API routes: `app/api/ingest/`

## Execution Model

The app is a Next.js App Router project.

Most work falls into one of these paths:

- server-rendered pages under `app/`
- authenticated route handlers under `app/api/`
- shared database reads and writes through Prisma-backed helpers in `lib/`
- UI composition through Atomic Design components

For pipeline integrations, the common pattern is:

- the dashboard triggers pipeline apps server-to-server
- pipeline apps write execution state into shared persistence
- the dashboard streams live status to the browser with SSE
- callback routes that serve pipeline apps stay outside the Auth.js proxy and use bearer-token auth instead

See the pipeline docs for the generic architecture and the current ingest implementation.

## UI And Styling Notes

- keep components in the correct Atomic Design layer
- prefer existing atoms and molecules before creating new UI primitives
- use MUI components and theme-driven styling
- use semantic class names for structural/layout styling
- do not introduce ad hoc presentational class names or inline styling patterns

If you need to change structure or styling rules, read the component and semantic styling docs first.

## Component Creation Checklist

Before adding a new component:

- check `components/atoms/`, `components/molecules/`, and `components/organisms/` for an existing reuse candidate
- prefer extending or composing an existing component before creating a new one
- choose the Atomic Design layer intentionally instead of defaulting to the nearest folder
- use a generic name unless the component is truly tied to one workflow
- keep app styling in shared primitives and the MUI theme rather than rebuilding it in task-specific JSX

Use this rubric:

- `atom`: one primitive or one thin app-styled wrapper such as `Button` or `Badge`
- `molecule`: a small composed unit that can be reused across multiple views
- `organism`: a feature-level section or workflow container with real orchestration or domain-specific state

Avoid these common mistakes:

- creating workflow-specific wrappers when a generic component would work
- placing composed or stateful workflow components in `atoms/`
- reimplementing an existing atom such as `Button`, `Badge`, dialog wrappers, or status display patterns
- creating new styling conventions instead of using the MUI theme and semantic classes

## Testing Notes

Follow the testing docs for scope and command choice.

Project-specific layout notes:

- `tests/unit/` is the fast Vitest suite
- `tests/integration/` covers integration behavior
- Storybook-specific tests run through the Storybook Vitest project

## Validation

Prefer repo scripts when possible:

- `npm run typecheck`
- `npm run lint`
- `npm run lint:project`
- `npm run lint:markdown`
- `npm run test`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:storybook`
- `npm run build`

## Guardrails

- treat the shared preservation database schema as external source of truth; do not invent local schema variants
- keep auth/session concerns in Auth.js and proxy configuration, not scattered per-page
- keep pipeline callback routes outside the Auth.js proxy when they are meant for server-to-server access
- prefer extending existing query helpers, components, and documentation over creating parallel patterns
- default to general-purpose reusable components before introducing task-specific ones
- if a useful assistant-facing note has no documentation yet, keep it brief and prefer creating the real documentation afterward
