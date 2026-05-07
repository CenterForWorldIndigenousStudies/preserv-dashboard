# Ingest Pipeline Integration

## Purpose

This document describes the current `preserv-dashboard` integration with
`preserv-data-ingester`.

For the broader reusable pattern, see
[PIPELINE_TRIGGER_CALLBACK_ARCHITECTURE.md](./PIPELINE_TRIGGER_CALLBACK_ARCHITECTURE.md).

## Current Scope

The current ingest flow supports:

- browsing Google Drive folders with the shared service account
- creating an ingest batch from the dashboard
- sending the ingest request to `preserv-data-ingester`
- streaming live batch-status updates to the browser with SSE
- recording callback receipt from `preserv-data-ingester`
- reading ingest status from the `batches` table

The primary route is `/ingest-documents`.

## High-Level Flow

```txt
User
  -> /ingest-documents
  -> GET /api/ingest/folders
  -> POST /api/ingest/start
  -> preserv-data-ingester POST /ingest
  -> preserv-data-ingester background execution
  -> GET /api/ingest/events
  -> dashboard streams batch status from shared DB to browser
  -> POST /api/ingest/callback
  -> dashboard records callback receipt
```

## Dashboard Components

### UI entrypoint

- [app/ingest-documents/page.tsx](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/ingest-documents/page.tsx:1)
- [components/organisms/IngestDocumentsManager.tsx](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/components/organisms/IngestDocumentsManager.tsx:1)

Responsibilities:

- render the ingest page
- load recent ingest batch statuses
- let the user enter `batchName`
- let the user select one or more source folders
- collect optional collection name and notes
- submit the request to the dashboard backend
- subscribe to live batch updates for the accepted batch over SSE

### Folder browsing route

- [app/api/ingest/folders/route.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/api/ingest/folders/route.ts:1)
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

If configured, this limits the top-level folder browser to those folder IDs.

### Trigger route

- [app/api/ingest/start/route.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/api/ingest/start/route.ts:1)

Responsibilities:

- require an authenticated dashboard session
- validate user input
- derive `started_by` from the current session
- derive `initiated_at` server-side
- build the callback URL and callback token payload
- send the request to `preserv-data-ingester`

Incoming dashboard request shape:

```json
{
  "batchName": "May 2026 Refugee Mental Health Ingest",
  "sourceFolderIds": ["folder-1", "folder-2"],
  "collectionName": "Periodicals",
  "collectionNotes": "Optional notes"
}
```

Outgoing ingester request shape:

```json
{
  "app": "preserv-dashboard",
  "request_id": "0f66fd56-b2f1-43f2-a6d4-e9be0d1d2608",
  "batch_name": "May 2026 Refugee Mental Health Ingest",
  "started_by": "user@example.org",
  "initiated_at": "2026-05-06T19:00:00Z",
  "source_folder_ids": ["folder-1", "folder-2"],
  "collection": {
    "name": "Periodicals",
    "notes": "Optional notes"
  },
  "callback": {
    "url": "https://dashboard.example.org/api/ingest/callback",
    "token": "shared-secret"
  }
}
```

The dashboard also sends an authorization header on the server-to-server
request:

```txt
Authorization: Bearer <DATA_INGESTER_TRIGGER_TOKEN>
```

### Callback route

- [app/api/ingest/callback/route.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/api/ingest/callback/route.ts:1)
- [lib/ingestBatches.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/lib/ingestBatches.ts:1)

Responsibilities:

- bypass Auth.js session protection at the proxy layer
- verify `Authorization: Bearer <token>`
- parse the callback payload
- require `batch_id`
- record callback receipt time in `batches.processing_details`

Current callback payload requirement:

```json
{
  "request_id": "0f66fd56-b2f1-43f2-a6d4-e9be0d1d2608",
  "batch_id": "batch-uuid",
  "status": "completed",
  "error": null
}
```

The callback route is intentionally excluded from the global Auth.js proxy.
Pipeline apps cannot complete a Google sign-in flow, so callback requests must
reach the route handler directly and be authenticated only by the callback
bearer token.

That exclusion is implemented in:

- [proxy.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/proxy.ts:1)

If the callback path is accidentally reintroduced into the global Auth.js
matcher, pipeline apps will typically see an HTTP `307 Temporary Redirect`
instead of reaching the callback route handler.

### SSE route

- [app/api/ingest/events/route.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/app/api/ingest/events/route.ts:1)
- [lib/ingestBatches.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/lib/ingestBatches.ts:1)

Responsibilities:

- require an authenticated dashboard session
- accept a `batchId` query parameter
- open a `text/event-stream` response
- send an initial batch snapshot immediately
- re-read batch status from the shared DB on a short server-side interval
- emit `batch_status` events only when the batch payload changes
- close the stream when the batch reaches `completed` or `failed`

## Persistence Model

Ingest execution state is stored in the related batch row under:

- `batches.processing_details.ingester`

The dashboard reads that structure through
[lib/ingestBatches.ts](/Users/marygoldaross/projects/CenterForWorldIndigenousStudies/preserv-dashboard/lib/ingestBatches.ts:1).

Fields currently surfaced by the dashboard include:

- `request_id`
- `status`
- `last_transition_at`
- `source_folder_ids`
- `collection.name`
- `collection.notes`
- `processed_count`
- `ingested_count`
- `duplicate_count`
- `skipped_same_origin_count`
- `error`
- `callback.delivery_status`
- `callback.notified_at`
- `callback.received_at`
- `callback.http_status`
- `callback.error_type`
- `callback.error_message`

## Environment Variables

Current ingest integration depends on:

```env
DATA_INGESTER_BASE_URL=https://your-data-ingester.example.com
DATA_INGESTER_TRIGGER_TOKEN=replace-this-with-a-shared-secret
INGESTER_CALLBACK_TOKEN=replace-this-with-a-shared-secret
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
GOOGLE_SERVICE_ACCOUNT_FILE=/absolute/path/to/service_account.json
GOOGLE_INGEST_SOURCE_ROOT_FOLDER_IDS=["folder-id-1","folder-id-2"]
```

Notes:

- use `GOOGLE_SERVICE_ACCOUNT_JSON` for Vercel-style deployments
- use `GOOGLE_SERVICE_ACCOUNT_FILE` for local file-based development
- `GOOGLE_SERVICE_ACCOUNT_JSON` takes precedence when both are present
- `GOOGLE_INGEST_SOURCE_ROOT_FOLDER_IDS` is optional

## Current Limitations

- The callback route records callback receipt, but does not persist a second
  full copy of the callback payload.
- The current SSE route is scoped to a single `batchId` per connection.
- The current SSE route re-reads the DB on a short server-side interval rather
  than using a push subscription from the database itself.
