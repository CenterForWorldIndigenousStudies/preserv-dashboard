# Process Page Integration

## Purpose

This document describes the current `preserv-dashboard` process-page
integration.

In the current implementation:

- ingest is the required first stage
- `document-splitter`, `page-rotator`, `ocr-processor`, and `content-dedup`
  are optional downstream stages
- the dashboard persists requested downstream stages in shared batch state
- the dashboard auto-triggers downstream stages server-side from pipeline
  callbacks according to the requested stage set

For the broader reusable pattern, see
[PIPELINE_TRIGGER_CALLBACK_ARCHITECTURE.md](./PIPELINE_TRIGGER_CALLBACK_ARCHITECTURE.md).

## Current Scope

The current process flow supports:

- browsing Google Drive folders with the shared service account
- creating a new batch from `/process-documents`
- selecting optional downstream stages
- sending the ingest request to `preserv-data-ingester`
- streaming live process updates to the browser with SSE
- recording callback receipt from `preserv-data-ingester`,
  `preserv-document-splitter`, `preserv-page-rotator`,
  `preserv-ocr-processor`, and `preserv-content-dedup`
- auto-triggering `preserv-document-splitter` from the ingester callback when
  appropriate
- auto-triggering `preserv-page-rotator` from the ingester callback when
  splitter was not requested
- auto-triggering `preserv-page-rotator` from the document-splitter callback
  when both stages were requested
- reading process state from the `batches` table

The primary route is `/process-documents`.

## High-Level Flow

```txt
User
  -> /process-documents
  -> GET /api/process/folders
  -> POST /api/process/start
  -> preserv-data-ingester POST /ingest
  -> preserv-data-ingester background execution
  -> GET /api/process/events
  -> POST /api/pipeline/ingester/callback
  -> dashboard records callback receipt
  -> dashboard checks processing_details.pipeline.requested_stages
  -> preserv-document-splitter POST /split (optional)
  -> preserv-document-splitter background execution (optional)
  -> POST /api/pipeline/document-splitter/callback (optional)
  -> dashboard records callback receipt
  -> preserv-page-rotator POST /rotate (optional)
  -> preserv-page-rotator background execution (optional)
  -> POST /api/pipeline/page-rotator/callback (optional)
  -> dashboard records callback receipt
```

## Dashboard Components

### UI entrypoint

- [app/process-documents/page.tsx](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/process-documents/page.tsx:1)
- [components/organisms/ProcessDocumentsManager.tsx](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/components/organisms/ProcessDocumentsManager.tsx:1)

Responsibilities:

- render the process page
- load recent process batch statuses
- let the user enter `batchName`
- let the user select one or more source folders
- collect optional collection name and notes
- let the user opt into downstream stages such as `document-splitter` and
  `page-rotator`
- submit the request to the dashboard backend
- subscribe to live batch updates for the accepted batch over SSE

### Folder browsing route

- [app/api/process/folders/route.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/api/process/folders/route.ts:1)
- [lib/googleDrive.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/lib/googleDrive.ts:1)

Responsibilities:

- require an authenticated dashboard session
- use the shared Google Drive service account server-side
- list top-level allowed folders
- list child folders for a selected parent

Credential resolution order:

1. `GOOGLE_SERVICE_ACCOUNT_JSON`
2. `GOOGLE_SERVICE_ACCOUNT_FILE`

Optional scope control:

- `GOOGLE_INGEST_SOURCE_ROOT_FOLDER_IDS`

### Process start route

- [app/api/process/start/route.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/api/process/start/route.ts:1)

Responsibilities:

- require an authenticated dashboard session
- validate user input
- derive `started_by` from the current session
- derive `initiated_at` server-side
- pass `requested_stages` through to `preserv-data-ingester`
- build the ingester callback URL and callback token payload
- send the request to `preserv-data-ingester`

Incoming dashboard request shape:

```json
{
  "batchName": "May 2026 Refugee Mental Health Ingest",
  "sourceFolderIds": ["folder-1", "folder-2"],
  "collectionName": "Periodicals",
  "collectionNotes": "Optional notes",
  "requestedStages": ["document-splitter", "page-rotator"]
}
```

Outgoing ingester request shape:

```json
{
  "app": "preserv-dashboard",
  "request_id": "0f66fd56-b2f1-43f2-a6d4-e9be0d1d2608",
  "batch_name": "May 2026 Refugee Mental Health Ingest",
  "started_by": "user@example.org",
  "initiated_at": "2026-05-08T19:00:00Z",
  "source_folder_ids": ["folder-1", "folder-2"],
  "requested_stages": ["document-splitter", "page-rotator"],
  "collection": {
    "name": "Periodicals",
    "notes": "Optional notes"
  },
  "callback": {
    "url": "https://dashboard.example.org/api/pipeline/ingester/callback",
    "token": "shared-secret"
  }
}
```

The dashboard also sends an authorization header on the server-to-server
request:

```txt
Authorization: Bearer <DATA_INGESTER_TRIGGER_TOKEN>
```

### Ingester callback route

- [app/api/pipeline/ingester/callback/route.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/api/pipeline/ingester/callback/route.ts:1)

Responsibilities:

- bypass Auth.js session protection at the proxy layer
- verify `Authorization: Bearer <DATA_INGESTER_CALLBACK_TOKEN>`
- parse the callback payload
- require `batch_id`
- record callback receipt time in `batches.processing_details.ingester.callback.received_at`
- load the batch process state
- trigger `preserv-document-splitter` when:
  - ingest status is `completed`
  - `document-splitter` appears in `processing_details.pipeline.requested_stages`
  - `processing_details.document_splitter.status` is not already `queued`,
    `running`, or `completed`
- trigger `preserv-page-rotator` directly when:
  - ingest status is `completed`
  - `page-rotator` appears in `processing_details.pipeline.requested_stages`
  - `document-splitter` was not requested
  - `processing_details.page_rotator.status` is not already `queued`,
    `running`, or `completed`

### Document-splitter trigger

- [lib/pipelineTriggers.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/lib/pipelineTriggers.ts:1)

Outgoing splitter request shape:

```json
{
  "app": "preserv-dashboard",
  "request_id": "new-uuid",
  "batch_id": "existing-batch-id",
  "started_by": "user@example.org",
  "initiated_at": "2026-05-08T19:10:00Z",
  "callback": {
    "url": "https://dashboard.example.org/api/pipeline/document-splitter/callback",
    "token": "shared-secret"
  }
}
```

The dashboard sends:

```txt
Authorization: Bearer <DOCUMENT_SPLITTER_TRIGGER_TOKEN>
```

### Document-splitter callback route

- [app/api/pipeline/document-splitter/callback/route.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/api/pipeline/document-splitter/callback/route.ts:1)

Responsibilities:

- bypass Auth.js session protection at the proxy layer
- verify `Authorization: Bearer <DOCUMENT_SPLITTER_CALLBACK_TOKEN>`
- parse the callback payload
- record callback receipt time in
  `batches.processing_details.document_splitter.callback.received_at`
- trigger `preserv-page-rotator` when:
  - `page-rotator` appears in `processing_details.pipeline.requested_stages`
  - `processing_details.page_rotator.status` is not already `queued`,
    `running`, or `completed`

### Page-rotator trigger

- [lib/pipelineTriggers.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/lib/pipelineTriggers.ts:1)

Outgoing page-rotator request shape:

```json
{
  "app": "preserv-dashboard",
  "request_id": "new-uuid",
  "batch_id": "existing-batch-id",
  "started_by": "user@example.org",
  "initiated_at": "2026-05-08T19:20:00Z",
  "callback": {
    "url": "https://dashboard.example.org/api/pipeline/page-rotator/callback",
    "token": "shared-secret"
  }
}
```

The dashboard sends:

```txt
Authorization: Bearer <PAGE_ROTATOR_TRIGGER_TOKEN>
```

### Page-rotator callback route

- [app/api/pipeline/page-rotator/callback/route.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/api/pipeline/page-rotator/callback/route.ts:1)

Responsibilities:

- bypass Auth.js session protection at the proxy layer
- verify `Authorization: Bearer <PAGE_ROTATOR_CALLBACK_TOKEN>`
- parse the callback payload
- record callback receipt time in
  `batches.processing_details.page_rotator.callback.received_at`

### SSE route

- [app/api/process/events/route.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/api/process/events/route.ts:1)
- [lib/processBatches.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/lib/processBatches.ts:1)

Responsibilities:

- require an authenticated dashboard session
- accept a `batchId` query parameter
- open a `text/event-stream` response
- send an initial process snapshot immediately
- re-read process state from the shared DB on a short server-side interval
- emit `batch_status` events only when the full payload changes
- keep the stream open through ingest completion when downstream stages are
  still pending
- close the stream only when the full requested process reaches terminal state

## Persistence Model

Process execution state lives in the related batch row under:

- `batches.processing_details.pipeline`
- `batches.processing_details.ingester`
- `batches.processing_details.document_splitter`
- `batches.processing_details.page_rotator`

Current orchestration intent:

- `processing_details.pipeline.requested_stages`

Current stage-specific callback receipt fields:

- `processing_details.ingester.callback.received_at`
- `processing_details.document_splitter.callback.received_at`
- `processing_details.page_rotator.callback.received_at`

## Environment Variables

Current process integration depends on:

```env
DASHBOARD_BASE_URL=https://dashboard.example.org
DATA_INGESTER_BASE_URL=https://your-data-ingester.example.com
DATA_INGESTER_TRIGGER_TOKEN=replace-this-with-a-shared-secret
DATA_INGESTER_CALLBACK_TOKEN=replace-this-with-a-shared-secret
DOCUMENT_SPLITTER_BASE_URL=https://your-document-splitter.example.com
DOCUMENT_SPLITTER_TRIGGER_TOKEN=replace-this-with-a-shared-secret
DOCUMENT_SPLITTER_CALLBACK_TOKEN=replace-this-with-a-shared-secret
PAGE_ROTATOR_BASE_URL=https://your-page-rotator.example.com
PAGE_ROTATOR_TRIGGER_TOKEN=replace-this-with-a-shared-secret
PAGE_ROTATOR_CALLBACK_TOKEN=replace-this-with-a-shared-secret
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
GOOGLE_SERVICE_ACCOUNT_FILE=/absolute/path/to/service_account.json
GOOGLE_INGEST_SOURCE_ROOT_FOLDER_IDS=["folder-id-1","folder-id-2"]
```

Notes:

- use `GOOGLE_SERVICE_ACCOUNT_JSON` for Vercel-style deployments
- use `GOOGLE_SERVICE_ACCOUNT_FILE` for local file-based development
- `GOOGLE_SERVICE_ACCOUNT_JSON` takes precedence when both are present
- `GOOGLE_INGEST_SOURCE_ROOT_FOLDER_IDS` is optional
- `DASHBOARD_BASE_URL` is useful when local pipeline apps run in Docker and
  need a host-reachable callback URL such as `http://host.docker.internal:3000`

## Auth Proxy Boundary

The callback routes are intentionally excluded from the global Auth.js proxy:

- `/api/pipeline/ingester/callback`
- `/api/pipeline/document-splitter/callback`
- `/api/pipeline/page-rotator/callback`
- `/api/pipeline/ocr-processor/callback`
- `/api/pipeline/content-dedup/callback`

That exclusion is implemented in:

- [proxy.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/proxy.ts:1)

If either callback path is accidentally reintroduced into the global Auth.js
matcher, the corresponding pipeline app will typically see an HTTP `307
Temporary Redirect` instead of reaching the route handler.
