# Pipeline Trigger, Callback, and SSE Architecture

## Purpose

This document describes the general pattern `preserv-dashboard` uses to trigger
external pipeline apps, receive server-to-server callbacks, and stream live
status updates to the browser.

The dashboard is the operator-facing control surface. The browser never talks
to pipeline apps directly.

For the currently implemented ingest example, see
[PIPELINE_INGEST_INTEGRATION.md](./PIPELINE_INGEST_INTEGRATION.md).

## Design Principles

- The browser talks only to `preserv-dashboard`.
- Authenticated dashboard users trigger pipeline work through dashboard routes.
- The dashboard calls pipeline apps server-to-server.
- Pipeline apps authenticate trigger requests from the dashboard with bearer
  tokens.
- Pipeline apps authenticate callbacks with bearer tokens.
- Shared database state is the source of truth for job and batch progress.
- The dashboard streams live browser updates with Server-Sent Events.
- Every trigger request should carry a `request_id` for cross-service
  correlation.

## High-Level Flow

```txt
User
  -> dashboard page
  -> authenticated dashboard API route
  -> pipeline app trigger endpoint
  -> pipeline app background execution
  -> shared DB status updates
  -> dashboard SSE route
  -> browser status updates
  -> optional dashboard callback route
```

## Architecture Layers

### Browser to dashboard

The browser interacts with:

- authenticated pages under `app/`
- authenticated API routes under `app/api/`
- SSE routes for live status updates

These routes use Auth.js session authentication.

### Dashboard to pipeline app

The dashboard sends trigger requests server-to-server.

Those requests should:

- be validated by the dashboard first
- derive operator identity from the Auth.js session
- include a `request_id`
- include an `Authorization: Bearer ...` header with a per-app trigger token

### Pipeline app back to dashboard

Pipeline apps may call a dashboard callback route when work completes or fails.

Those routes must:

- stay outside the global Auth.js proxy matcher
- use bearer-token authentication, not browser-session authentication
- record receipt and diagnostics

### Dashboard to browser live updates

The browser should not wait on the callback directly.

Instead:

- the pipeline app writes status into shared persistence
- the dashboard reads that status
- the dashboard streams updates over SSE

This keeps server-to-server notification separate from browser synchronization.

## Security Model

### User authentication

Operator-facing pages and routes require an authenticated Auth.js session.

### Trigger authentication

Each pipeline app should have its own dashboard-to-app trigger token.

Example:

```txt
Authorization: Bearer <DATA_INGESTER_TRIGGER_TOKEN>
```

### Callback authentication

Each pipeline app should have its own app-to-dashboard callback token.

Example:

```txt
Authorization: Bearer <INGESTER_CALLBACK_TOKEN>
```

Callback routes must stay outside the global Auth.js proxy matcher. If a
callback path is accidentally protected by the proxy, the pipeline app will
typically receive an HTTP `307 Temporary Redirect` instead of reaching the
route handler.

## Persistence Model

Pipeline execution state should live with the relevant domain record in shared
storage.

In the current ingest implementation, that state lives in:

- `batches.processing_details.ingester`

Future pipeline apps should follow the same pattern and persist app-specific
execution state in the appropriate `processing_details` object rather than
creating disconnected state stores inside the dashboard.

## SSE Model

Server-Sent Events are the browser update mechanism.

Recommended SSE behavior:

- require an authenticated dashboard session
- send an initial snapshot immediately
- re-read shared status on a short server-side interval
- emit only when the payload changes
- close the stream on terminal state

This is simpler than websockets and fits the current one-way server-to-browser
update needs.

## Observability

The trigger and callback flow should use three observability layers:

- structured server logs in both services
- a shared `request_id` carried through trigger and callback payloads
- persisted callback and execution diagnostics in shared processing details

At minimum, observability should answer:

- Was the trigger accepted?
- Did background execution start?
- Did the status move from queued to running?
- Did callback delivery fail because of auth, timeout, or connection error?
- Did the dashboard receive the callback even if the browser was closed?

## Recommended Pattern for Future Pipeline Apps

Future pipeline apps such as page rotation, OCR, and metadata extraction should
follow the same shape:

1. dashboard route validates user input and derives operator identity
2. dashboard sends a server-to-server trigger request
3. pipeline app performs work asynchronously
4. pipeline app writes shared status updates
5. dashboard streams live browser updates over SSE
6. pipeline app may call a token-protected dashboard callback route
7. dashboard records callback receipt and diagnostics

Recommended conventions:

- separate logical callback endpoint per pipeline app
- separate trigger token per pipeline app
- separate callback token per pipeline app
- shared bearer-token callback style
- shared `request_id` correlation pattern
- shared use of `processing_details` for app-specific execution metadata

Example route family:

- `/api/pipeline/ingester/callback`
- `/api/pipeline/page-rotator/callback`
- `/api/pipeline/ocr-processor/callback`
- `/api/pipeline/metadata-extractor/callback`

Example env family:

- `INGESTER_CALLBACK_TOKEN`
- `PAGE_ROTATOR_TRIGGER_TOKEN`
- `PAGE_ROTATOR_CALLBACK_TOKEN`
- `OCR_PROCESSOR_TRIGGER_TOKEN`
- `OCR_PROCESSOR_CALLBACK_TOKEN`
- `METADATA_EXTRACTOR_TRIGGER_TOKEN`
- `METADATA_EXTRACTOR_CALLBACK_TOKEN`

## Current Scope

The currently implemented concrete example is document ingest.

See:

- [PIPELINE_INGEST_INTEGRATION.md](./PIPELINE_INGEST_INTEGRATION.md)

## Related Files

- [auth.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/auth.ts:1)
- [proxy.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/proxy.ts:1)
- [lib/observability.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/lib/observability.ts:1)
