# CWIS Preservation Database Schema

Keywords: CWIS Preservation Database Schema, PRESERVATION DB, collection qualifiers, publication claims, Alembic migrations, foreign key delete rules, database defaults, schema reference, hash_binary, hash_content, binary_hash metadata

This is the canonical human-readable reference for the shared database schema through Alembic revision `0003_publication_claims`.
The migrations in [`src/preserv_pipeline/db/alembic/versions/`](../../src/preserv_pipeline/db/alembic/versions/) implement this schema; an individual environment may be at an earlier revision until its migrations are applied.

```mermaid
erDiagram
    documents {
        varchar id PK
        bigint filesize
        varchar hash_binary
        varchar hash_content
        varchar id_legacy
        varchar name
        datetime created_at
        datetime updated_at
    }

    document_access {
        varchar id PK
        varchar document_id FK
        varchar access_level_id FK
        varchar granted_by_name
        varchar granted_by_email
        datetime granted_at
    }

    access_levels {
        varchar id PK
        varchar level_name UK
        text description
        datetime created_at
        datetime updated_at
    }

    document_quality {
        varchar id PK
        varchar document_id FK, UK
        text comment
        text comment_additional
        json review_checklist
        enum validation_status
        bigint validation_timestamp
        varchar validator_name
        varchar validator_email
        bool reprocess
        varchar current_status FK
        datetime created_at
        datetime updated_at
    }

    state_history {
        varchar id PK
        varchar document_id FK
        varchar previous_state
        varchar new_state
        datetime changed_at
    }

    document_to_contributors {
        varchar id PK
        varchar document_id FK
        varchar contributor_id FK
        varchar type
        varchar role
        text notes
        datetime created_at
        datetime updated_at
    }

    contributors {
        varchar id PK
        text name
        varchar name_hash UK
        text notes
        datetime created_at
        datetime updated_at
    }

    document_to_batches {
        varchar id PK
        varchar document_id FK
        varchar batch_id FK
        datetime added_at
        text batch_origin
        decimal cost
        int processing_time_seconds
        bool ocr_quality_low
        bool ocr_quality_medium
        json processing_details
    }

    batches {
        varchar id PK
        varchar id_legacy
        text name
        varchar name_hash UK
        json processing_details
        datetime created_at
        datetime updated_at
        datetime started_at
        datetime completed_at
        datetime last_processed
        varchar started_by
        varchar lifecycle_status
        varchar publication_target
    }

    pipeline_queue_items {
        varchar id PK
        varchar stage
        varchar batch_id
        json payload
        varchar status
        int attempt_count
        datetime queued_at
        datetime claimed_at
        datetime completed_at
        datetime cancelled_at
        text cancel_reason
        varchar error_type
        text error_message
        json callback_delivery
    }

    batch_rollbacks {
        varchar id PK
        varchar batch_id FK, UK
        text original_batch_name
        int rollback_number
        varchar requested_by
        text reason
        varchar idempotency_key UK
        varchar status
        datetime requested_at
        datetime started_at
        datetime completed_at
        datetime resolved_at
        int restored_count
        int deleted_count
        int cancelled_count
        int conflict_count
        int failed_count
        text last_failure
        json callback_delivery
        datetime created_at
        datetime updated_at
    }

    batch_mutations {
        varchar id PK
        varchar batch_id FK
        int execution_order
        varchar rollback_id FK
        varchar stage
        int pass_number
        varchar resource_type
        varchar resource_id
        varchar operation
        json before_snapshot
        varchar after_fingerprint
        varchar rollback_action
        varchar status
        int attempts
        datetime planned_at
        datetime applied_at
        datetime rolled_back_at
        text last_error
        datetime created_at
        datetime updated_at
    }

    batch_external_operations {
        varchar id PK
        varchar batch_id FK
        varchar stage
        varchar provider
        varchar operation
        varchar resource_type
        varchar idempotency_key UK
        json request
        json external_ids
        varchar status
        int attempts
        datetime planned_at
        datetime started_at
        datetime applied_at
        datetime completed_at
        datetime next_recovery_at
        text last_error
        datetime created_at
        datetime updated_at
    }

    fedora_removal_requests {
        varchar id PK
        varchar requested_by
        varchar idempotency_key UK
        varchar status
        datetime requested_at
        datetime started_at
        datetime completed_at
        text last_failure
        datetime created_at
        datetime updated_at
    }

    fedora_removal_items {
        varchar id PK
        varchar request_id FK
        varchar document_id
        varchar publication_document_id
        varchar source_candidate_document_id
        varchar source_state
        varchar original_batch_id
        varchar fedora_node_id
        text fedora_url
        varchar fedora_media_id
        varchar submission_file_id
        varchar submission_folder_id
        varchar submission_parent_folder_id
        varchar workbench_csv_file_id
        varchar status
        varchar fedora_delete_status
        varchar drive_quarantine_status
        varchar restoration_status
        varchar error_type
        text error_message
        varchar last_retry_by
        datetime last_retry_at
        datetime requested_at
        datetime started_at
        datetime completed_at
        datetime created_at
        datetime updated_at
    }

    pipeline_worker_leases {
        varchar id PK
        varchar active_batch_id FK
        varchar lease_token
        datetime acquired_at
        datetime heartbeat_at
        datetime released_at
    }

    batch_to_batches_metadata {
        varchar id PK
        varchar batch_id FK
        varchar batch_metadata_id FK
        json value
        varchar value_type
        datetime created_at
        datetime updated_at
    }

    batch_metadata {
        varchar id PK
        text name
        varchar name_hash UK
        text notes
        datetime created_at
        datetime updated_at
    }

    document_to_metadata {
        varchar id PK
        varchar document_id FK
        varchar metadata_id FK
        json value
        varchar value_type
        datetime created_at
        datetime updated_at
    }

    metadata {
        varchar id PK
        text name
        varchar name_hash UK
        text notes
        datetime created_at
        datetime updated_at
    }

    document_to_publishers {
        varchar id PK
        varchar document_id FK
        varchar publisher_id FK
        text notes
        datetime created_at
        datetime updated_at
    }

    publishers {
        varchar id PK
        text name
        varchar name_hash UK
        text notes
        datetime created_at
        datetime updated_at
    }

    document_to_tags {
        varchar id PK
        varchar document_id FK
        varchar tag_id FK
        text notes
        datetime created_at
    }

    tags {
        varchar id PK
        text name
        varchar name_hash UK
        text notes
        datetime created_at
        datetime updated_at
    }

    collections {
        varchar id PK
        varchar tag_id FK, UK
        varchar fedora_node_id
        text notes
        datetime created_at
        datetime updated_at
    }

    collection_qualifiers {
        varchar id PK
        varchar collection_id FK
        varchar tag_id FK
        datetime created_at
        datetime updated_at
    }

    publication_attempts {
        varchar id PK
        varchar operation_id UK
        varchar batch_id FK, UK
        varchar requested_by
        datetime created_at
    }

    publication_source_claims {
        varchar id PK
        varchar attempt_id FK
        varchar source_document_id FK, UK
        datetime created_at
    }

    alembic_version {
        varchar version_num PK
    }

    document_versions {
        varchar id PK
        varchar document_id FK
        varchar version_group_id FK
        text notes
        text changes_summary
        float similarity_score
        bigint analyzed_at
        datetime created_at
        datetime updated_at
    }

    version_groups {
        varchar id PK
        varchar canonical_document_id FK, UK
        text notes
        datetime created_at
        datetime updated_at
    }

    edit_history {
        varchar id PK
        varchar entity_id
        varchar entity_table
        json previous_value
        json new_value
        varchar editor_email
        varchar edit_summary
        datetime edited_at
    }

    drive_exclusion_review_items {
        varchar id PK
        varchar root_drive_id
        varchar drive_id
        varchar parent_drive_id
        varchar item_type
        varchar name
        varchar mime_type
        text drive_url
        text path
        int depth
        varchar explicit_review_decision
        varchar explicit_reviewed_by_email
        datetime explicit_reviewed_at
        varchar effective_ancestor_drive_id
        varchar effective_ancestor_decision
        datetime effective_ancestor_reviewed_at
        varchar subtree_index_status
        datetime discovered_at
        datetime last_synced_at
        text last_sync_error
        datetime created_at
        datetime updated_at
    }

    documents ||--o{ document_access : "access"
    documents ||--o| document_quality : "quality"
    documents ||--o{ document_to_contributors : "contributors"
    documents ||--o{ document_to_batches : "batches"
    documents ||--o{ document_to_metadata : "metadata"
    documents ||--o{ document_to_publishers : "publishers"
    documents ||--o{ document_to_tags : "tags"
    documents ||--o{ document_versions : "versions"
    documents ||--o{ state_history : "state"
    documents ||--o{ publication_source_claims : "claimed for publication"
    documents ||--o| version_groups : "canonical_for"
    contributors ||--o{ document_to_contributors : "document_to_contributors"
    publishers ||--o{ document_to_publishers : "document_to_publishers"
    batches ||--o{ document_to_batches : "document_to_batches"
    batches ||--o{ batch_to_batches_metadata : "batch_metadata"
    batches ||--o| batch_rollbacks : "rollback"
    batches ||--o{ batch_mutations : "mutations"
    batches ||--o{ batch_external_operations : "external work"
    batches ||--o| publication_attempts : "publication attempt"
    publication_attempts ||--o{ publication_source_claims : "source claims"
    fedora_removal_requests ||--o{ fedora_removal_items : "items"
    batches ||--o{ pipeline_worker_leases : "active_batch"
    batch_rollbacks ||--o{ batch_mutations : "journal"
    metadata ||--o{ document_to_metadata : "document_to_metadata"
    batch_metadata ||--o{ batch_to_batches_metadata : "batch_metadata"
    tags ||--o{ document_to_tags : "document_to_tags"
    tags ||--o| collections : "collection"
    tags ||--o{ collection_qualifiers : "additional qualifier"
    collections ||--o{ collection_qualifiers : "qualifiers"
    version_groups ||--o{ document_versions : "document_versions"
    state_history ||--o{ document_quality : "current_status"
    access_levels ||--o{ document_access : "document_access"

%% Composite Indexes:
%%   document_to_contributors.(document_id, contributor_id, role) (composite unique)
%%   document_to_batches.(document_id, batch_id) (composite unique)
%%   document_to_metadata.(document_id, metadata_id) (composite unique)
%%   document_to_publishers.(document_id, publisher_id) (composite unique)
%%   document_to_tags.(document_id, tag_id) (composite unique)
%%   document_versions.(document_id, version_group_id) (composite unique)
%%   collection_qualifiers.(collection_id, tag_id) (composite unique)
%%   publication_attempts.operation_id and publication_attempts.batch_id (individually unique)
%%   publication_source_claims.source_document_id (unique active claim)
```

---

## How To Read This Schema

- `documents` is the anchor table. Most queries start there and join outward.
- `batches` is the anchor table for processing runs and registry-derived batch context.
- `pipeline_queue_items` is the durable queue control table for the combined pipeline server.
- `drive_exclusion_review_items` is the indexed Google Drive tree backing the dashboard's `Exclusion Review` workspace.
- `document_to_*` tables and `batch_to_batches_metadata` are association tables.
  They connect a core entity to a lookup table or to typed metadata values.
- `metadata` and `batch_metadata` define field names.
  The actual values live in `document_to_metadata` and `batch_to_batches_metadata`.
- `collections.tag_id` identifies the canonical qualifier tag, while `collection_qualifiers` links additional qualifier tags.
  Collection membership is calculated from document tags and qualifying metadata values; there is no document-to-collection association table.
- Several lookup tables use a generated `name_hash` column.
  This is primarily for deduplication and indexing, not for human-facing querying.
- JSON values are stored in database `JSON` columns.
  For analysis, expect to use JSON extraction functions when reading structured values.

## Query-Oriented Notes

- Use `documents.id` and `batches.id` for joins.
- Use `documents.id_legacy` and `batches.id_legacy` when you need to match back to source-system identifiers.
- `document_quality.validation_timestamp` and `document_versions.analyzed_at` are `BIGINT` unix timestamps.
  Most other temporal columns are SQL `DATETIME`.
- `document_to_metadata.value` and `batch_to_batches_metadata.value` are database `JSON` columns.
  The pipeline convention is to store typed payloads in the wrapper shape
  `{"value": <typed_value>}`; the wrapper itself is not enforced by the database.
- `document_to_metadata.value_type` and `batch_to_batches_metadata.value_type` describe the logical type of that inner typed value.
- `state_history` is an append-only event table.
  `document_quality.current_status` points to one row in that history.
- `state_history` prevents exact duplicate transitions with a composite unique constraint on `(document_id, previous_state, new_state, changed_at)`.
- `pipeline_queue_items.payload` stores the original accepted trigger payload used by the worker.
- `pipeline_queue_items.callback_delivery` stores the callback delivery result recorded after worker completion.
- `batches.lifecycle_status` is the durable batch workflow state.
  Current values are `draft`, `queued`, `running`, `complete`, `published`, `failed`, `publication_locked`, `archive`, `rollback_requested`, `draining`, `rollback_in_progress`, `rollback_failed`, and `rolled_back`.
  Drafts are editable cart batches, `failed` is rerunnable before manual edits, `complete` means configured processing finished before publication, and `published` means Fedora publication was verified.
  `publication_locked` prevents rerun after an edit or uncertain/irreversible publication.
  A `complete` batch is the Dashboard's derived Ready for Library state.
  Rollback is eligible for pre-publication `queued`, `running`, `complete`, and `failed` states; `publication_locked` and `published` are not rollback eligible.
- `publication_target` identifies the configured provider, currently `fedora`.
- `batch_rollbacks` retains the requested rollback, operator information, progress counts, failures, retries, and explicit resolutions.
  There is at most one rollback record per batch.
- `batch_mutations` is the rollback journal.
  It records database before-images and generated Google Drive artifacts; it does not authorize modifying pre-existing source files.
- `batch_external_operations` is the durable intent ledger for external work.
  It is written before a Drive request, carries an idempotency key and recovery metadata, and remains available when a worker dies before the resulting Drive ID can be attached to `batch_mutations`.
- `publication_attempts` records the operation and batch for a selected-document publication.
  `publication_source_claims` reserves each selected source document while that attempt is active; its unique `source_document_id` prevents overlapping active claims.
  Claims are removed after confirmed complete publication or successful pre-Fedora rollback, while the attempt row remains for audit and idempotent replay.
- `pipeline_worker_leases` is a singleton durable coordination row.
  Its active batch lease keeps later batches queued while the current batch drains or rolls back, including after worker restart.

## Index Highlights

- `documents` is indexed on `created_at`, `updated_at`, `name`, `filesize`, `hash_binary`, and `hash_content`.
- `state_history` is indexed on `document_id` and `(document_id, changed_at)`.
- `state_history` is also unique on `(document_id, previous_state, new_state, changed_at)`.
- `edit_history` is indexed on `(entity_table, entity_id)` and
  `(entity_table, entity_id, edited_at)`.
- `document_to_metadata` supports both document-first and metadata-first access patterns.
- `document_to_tags` supports both document-first and tag-first access patterns.
- `collections` is indexed and unique on `tag_id`.
- `collection_qualifiers` is unique on `(collection_id, tag_id)`; an additional tag may qualify multiple collections.
- `publication_attempts` is unique on `operation_id` and separately on `batch_id`.
- `publication_source_claims` is unique on `source_document_id` while a claim row exists.
- `pipeline_queue_items` is indexed on `stage`, `batch_id`, and `status`.
- `drive_exclusion_review_items` is indexed for root-scoped parent, item-type, effective-ancestor, and subtree-status access patterns.
- `batch_rollbacks` is indexed on `batch_id` and `status`.
- `batch_mutations` is indexed on batch execution order, rollback, and mutation status.
  The durable `execution_order` is assigned within each batch so compensation does not depend on database timestamps, which may be truncated to whole seconds.
  It is unique within a batch.
- `batch_external_operations` is indexed on batch/status and status/next recovery time so scheduled reconciliation does not poll the provider on every worker loop.
- Association tables use composite unique constraints to prevent duplicate links.

## Referential And Default Rules

These database rules affect application behavior beyond the column types and unique constraints listed below:

| Relationship | On Delete | Effect |
| --- | --- | --- |
| `collections.tag_id` to `tags.id`; `collection_qualifiers` to `collections` and `tags` | CASCADE | Deleting a canonical tag deletes its collection definition; deleting a collection or additional qualifier tag deletes its qualifier links. |
| Document association tables to their parent document or lookup row | CASCADE | Dependent document links are removed with the referenced row. |
| `batch_rollbacks`, `batch_mutations`, `batch_external_operations`, and `publication_attempts` to `batches.id` | RESTRICT | Retained operational history prevents deleting a referenced batch. |
| `publication_source_claims` to `publication_attempts.id` and `documents.id`; `fedora_removal_items` to `fedora_removal_requests.id` | RESTRICT | Active claims and removal audit items keep their referenced identities available. |
| `batch_mutations.rollback_id`, `document_quality.current_status`, and `pipeline_worker_leases.active_batch_id` | SET NULL | Deleting the referenced rollback, state, or batch clears the optional pointer. |

| Column | Database Default | Nullability / Use |
| --- | --- | --- |
| `batches.processing_details`, `document_to_batches.processing_details` | `{}` | Required JSON processing context. |
| `batches.lifecycle_status`, `batches.publication_target` | `queued`, `fedora` | Required batch workflow and target. |
| `pipeline_queue_items.attempt_count`, `pipeline_queue_items.queued_at` | `0`, `CURRENT_TIMESTAMP` | Required retry count and enqueue time; `status` must be supplied by the caller. |
| `batch_rollbacks.status`, `batch_rollbacks.rollback_number`, rollback counters | `requested`, `1`, `0` | Required rollback status, suffix number, and progress counters. |
| `batch_mutations.status`, `batch_external_operations.status`; both `attempts` columns | `planned`; `0` | Required state and retry counts for durable work. |
| `collections.fedora_node_id` | No default | Nullable so a collection can exist before its Library ID is assigned. |
| `publication_attempts.operation_id`, `publication_attempts.batch_id`, `publication_source_claims.source_document_id` | No default | Required identities; an existing claim row is an active reservation. |

For exact DDL, consult the versioned Alembic migrations linked above. This document records the behavioral schema contract; the migration files define the executable schema.

## Meaningful Metadata

The schema is intentionally generic: document metadata names live in `metadata`, and the actual values live in `document_to_metadata`.
That means the dashboard should not treat every metadata key as equally important.
Some keys are part of the shared pipeline contract and have stable meaning across services; others are legacy/import values preserved for provenance and troubleshooting.

### Canonical Document Metadata

These shared keys have stable meaning across the pipeline when showing document lineage, managed Google Drive artifacts, and Fedora publication identity.

| Metadata Name | Meaning | Typical Producer | Dashboard Use |
| --- | --- | --- | --- |
| `source_id` | Google Drive file ID for the current managed document artifact. | `preserv-data-ingester`, `preserv-document-splitter`, `preserv-page-rotator`, `preserv-ocr-processor` | Build the current file link, identify the current stored artifact. |
| `source_folder_id` | Google Drive folder ID containing the current managed document artifact. | Same as above | Build the managed folder link, trace where the current artifact lives. |
| `origin_url` | Original upstream Google Drive file URL for this document lineage. | `preserv-data-ingester`, `preserv-data-combiner` | Show provenance, link back to the original source file when needed. |
| `origin_source_id` | Original upstream Google Drive file ID for this document lineage. | `preserv-data-ingester` | Stable original-source identity, useful when comparing imported vs managed artifacts. |
| `origin_parent_source_id` | Original upstream parent Google Drive folder ID for this document lineage. | `preserv-data-ingester` | Group or filter by original source folder. |
| `origin_parent_name` | Original upstream parent Google Drive folder name for this document lineage. | `preserv-data-ingester` | Human-readable display of original source location. |
| `preservation_candidate` | Boolean flag for the current active preservation artifact in a lineage. | Shared pipeline services | Marks the artifact that should continue through downstream preservation stages and final Fedora ingest. |
| `comment_pipeline` | Structured pipeline comments keyed by service run identity. | Pipeline services that persist review/failure context | Show per-run processing notes, review reasons, and failure context without overloading `document_quality.comment`. |
| `content_dedup_text_source_id` | Google Drive file ID of the document artifact used as the text source for content deduplication. | `preserv-content-dedup` | Trace which managed artifact was actually hashed and compared during content deduplication. |
| `needs_review` | Active, unresolved review reasons for the current review episode. | Pipeline stages and data-combiner | Drives Review Queue eligibility when no persisted quality status exists and provides the specific reasons shown to reviewers. |
| `needs_review_history` | Append-only JSON history of resolved review episodes. | Dashboard decisions and legacy reconciliation | Preserves reasons, decisions, timestamps, and reviewers after active review metadata is removed. |
| `fedora_url` | Islandora/Fedora object URL after confirmed publication. | `preserv-fedora-ingester` | Link to the Library object and identify the external target for removal. |
| `fedora_node_id` | Existing Islandora/Fedora node identity for an update. | `preserv-fedora-ingester` | Update or remove the correct node. |
| `fedora_media_id` | Existing Islandora/Fedora media identity for a binary update. | `preserv-fedora-ingester` | Update the correct media. |
| `fedora_publication_source_document_id` | Document ID of the immediate pre-Fedora candidate used for the publication. | `preserv-fedora-ingester` | Restore that candidate after Library removal. |
| `fedora_csv_source_id` | Google Drive file ID of the generated per-document Fedora CSV. | `preserv-fedora-ingester` | Trace the submission artifact. |
| `fedora_generated` | Boolean marker for Fedora export metadata generated by the ingester. | `preserv-fedora-ingester` | Distinguish generated publication context from descriptive source metadata. |

Practical rule:

- if the dashboard needs the current managed file, prefer `source_id`
- if the dashboard needs original provenance, prefer the `origin_*` keys
- if the dashboard or a downstream service needs the current pipeline artifact,
  prefer `preservation_candidate=true`
- if the dashboard needs per-service processing or failure notes, prefer `comment_pipeline`

### Legacy And Import Metadata

These keys are still meaningful, but they are not the current managed-artifact contract.
They are mainly preserved from inventory or registry sources so the dashboard can show what the original spreadsheet or registry said.

| Metadata Name | Meaning | Producer | Dashboard Use |
| --- | --- | --- | --- |
| `legacy_canonical_id` | Original `original_id` value from the General Inventory spreadsheet. | `preserv-data-combiner` | Show old source-system identity without confusing it with current Drive IDs. |
| `legacy_format_origin` | Original `Format_Origin` value from the General Inventory spreadsheet. | `preserv-data-combiner` | Show the spreadsheet’s claimed format alongside actual `mime_type` / extension. |
| `legacy_file_size_origin` | Original `Size_Origin` value from the General Inventory spreadsheet. | `preserv-data-combiner` | Show the spreadsheet’s recorded size when it differs from actual Drive size. |
| `legacy_batch_origin` | Original `Batch_Origin` value from the General Inventory spreadsheet. | `preserv-data-combiner` | Useful in batch search, troubleshooting, and historical context. |

Practical rule:

- if a value starts with `legacy_`, treat it as preserved historical context, not as the current operational source of truth

### Operational Processing Metadata

These keys are not the primary lineage contract, but they are part of the active processing model and are useful for troubleshooting, audit, and operational displays.

| Metadata Name | Meaning | Typical Producer | Dashboard Use |
| --- | --- | --- | --- |
| `content_hash_algorithm` | Algorithm used to generate the current content hash. | `preserv-content-dedup` | Explain how `documents.hash_content` was derived. |
| `content_hash_timestamp` | Timestamp of the content-hash generation event. | `preserv-content-dedup` | Show when the current content hash was last computed. |

### Related Non-Metadata Columns

Some values that look similar to metadata are actually first-class columns and should be read from their tables directly instead of from `document_to_metadata`.
Use `documents.hash_binary` for the current artifact's file checksum and `documents.hash_content` for its content-derived hash. The former `binary_hash` metadata key duplicated the file checksum and is no longer written or copied to derived artifacts.

| Location | Meaning | Notes |
| --- | --- | --- |
| `documents.filesize` | Current file size in bytes. | Preferred over legacy size metadata. |
| `documents.name` | Current document name. | Primary display name. |
| `documents.id_legacy` | Legacy document identifier stored as a first-class column. | Separate from `legacy_canonical_id` metadata. |
| `document_to_batches.batch_origin` | Per-link batch origin text. | Useful for batch filtering and tracing document membership. |
| `batches.name` | Unique batch name. |  |
| `batches.id_legacy` | Registry-derived legacy batch identifier. | Stable batch identity from Master Registries. |
| `collections.fedora_node_id` | Islandora/Fedora collection node ID (Library ID). | Unlike document metadata `fedora_node_id`, this identifies a collection node used in membership mapping. |

### Query Pattern

To get document metadata, join:

- `documents`
- `document_to_metadata`
- `metadata`

For batch metadata, join:

- `batches`
- `batch_to_batches_metadata`
- `batch_metadata`

In practice, most dashboard queries should:

- use first-class columns where they exist
- use canonical metadata keys for current Drive/provenance fields
- use `legacy_*` metadata only for historical context, validation, or advanced search

Review lifecycle note:

- `needs_review` and `needs_review_history` are metadata definitions in `metadata`, not columns on `documents`.
- Their values are stored in `document_to_metadata`, with one value per document and metadata definition because `(document_id, metadata_id)` is unique.
- `needs_review` is removed when a dashboard approval or rejection resolves the current episode.
- `needs_review_history` retains the resolved episodes in its versioned `episodes` array and is never removed by normal review decisions.
- See the [dashboard review lifecycle runbook](../dashboard/REVIEW_LIFECYCLE.md) for view eligibility and legacy reconciliation.

## Table Reference

### alembic_version

Alembic's migration tracking table. It records the revision applied to this database; it is maintained by Alembic rather than an application model.

| Column | Type | Notes |
| --- | --- | --- |
| `version_num` | `VARCHAR(32)` | Primary key. Current applied revision. |

### documents

Primary document records.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. UUID string. |
| `filesize` | `BIGINT` | File size in bytes. |
| `hash_binary` | `VARCHAR(255)` | SHA-256 of this document artifact's exact file bytes. Indexed; authoritative for the binary. |
| `hash_content` | `VARCHAR(255)` | Content-derived hash. Content deduplication hashes normalized extracted text; other stages may use their own content representation. Indexed and nullable. |
| `id_legacy` | `VARCHAR(255)` | Unique source-system document identifier. |
| `name` | `VARCHAR(255)` | Document name. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

Common joins: `document_quality`, `state_history`, `document_access`, `document_to_metadata`, `document_to_tags`, `document_to_contributors`, `document_to_publishers`, `document_to_batches`, `document_versions`.

### document_access

Access-level assignments for documents.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `document_id` | `VARCHAR(36)` | FK to `documents.id`. |
| `access_level_id` | `VARCHAR(36)` | FK to `access_levels.id`. |
| `granted_by_name` | `VARCHAR(255)` | Grantor/display name. |
| `granted_by_email` | `VARCHAR(255)` | Grantor email. |
| `granted_at` | `DATETIME` | Assignment datetime. |

Constraint notes: unique on `(document_id, access_level_id)`.

### access_levels

Lookup table for access vocabulary.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `level_name` | `VARCHAR(255)` | Unique access level name. |
| `description` | `TEXT` | Human-readable description. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

Typical values include `public`, `restricted`, `internal`, `admin`, and `confidential`.

### document_quality

One quality/validation record per document.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `document_id` | `VARCHAR(36)` | FK to `documents.id`. Unique. |
| `comment` | `TEXT` | Primary quality note. |
| `comment_additional` | `TEXT` | Additional quality note. |
| `review_checklist` | `JSON` | Current Review Queue checklist state. Manual changes are audited in `edit_history`; the active state is cleared when a review decision is finalized. |
| `validation_status` | `ENUM` | Normalized validation outcome. Allowed values: `VALIDATED`, `APPROVED`, `FORMAT_ERRORS`, `METADATA_ISSUES`, `NEEDS_REVIEW`, `GENERAL_ERRORS`, `REJECTED`. |
| `validation_timestamp` | `BIGINT` | Unix timestamp. |
| `validator_name` | `VARCHAR(255)` | Validator display name. |
| `validator_email` | `VARCHAR(255)` | Validator email. |
| `reprocess` | `BOOLEAN` | Whether the document should be reprocessed or not. |
| `current_status` | `VARCHAR(36)` | FK to `state_history.id`. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

Query note: this is a one-to-one extension of `documents`.
The normalized validation-status values are enforced by the database enum and are also used by the data-combiner and dashboard.

### state_history

Document state transitions over time.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `document_id` | `VARCHAR(36)` | FK to `documents.id`. |
| `previous_state` | `VARCHAR(255)` | Prior state label. |
| `new_state` | `VARCHAR(255)` | New state label. |
| `changed_at` | `DATETIME` | Transition time. |

Query note: use this table for status history; `document_quality.current_status` points to one row here.
The table also enforces a composite unique constraint on `(document_id, previous_state, new_state, changed_at)`.
The persisted state values are strings; the canonical known-value contract is [`contracts/document-states.json`](../../contracts/document-states.json).

### contributors

Contributor lookup table for people and organizations associated with documents.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `name` | `TEXT` | Contributor name. |
| `name_hash` | `VARCHAR(64)` | Generated stored SHA-256 hash of normalized `name`. Unique. |
| `notes` | `TEXT` | Internal notes. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

### document_to_contributors

Document-to-contributor association table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `document_id` | `VARCHAR(36)` | FK to `documents.id`. |
| `contributor_id` | `VARCHAR(36)` | FK to `contributors.id`. |
| `type` | `VARCHAR(255)` | Ordering tier such as `PRIMARY`, `SECONDARY`, or `TERTIARY`. |
| `role` | `VARCHAR(255)` | Controlled contribution role such as `author`, `editor`, or `translator`. |
| `notes` | `TEXT` | Attribution notes. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

Constraint notes: unique on `(document_id, contributor_id, role)`, allowing one contributor to have multiple roles on the same document.

### publishers

Publisher lookup table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `name` | `TEXT` | Publisher name. |
| `name_hash` | `VARCHAR(64)` | Generated stored SHA-256 hash of normalized `name`. Unique. |
| `notes` | `TEXT` | Internal notes. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

### document_to_publishers

Document-to-publisher association table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `document_id` | `VARCHAR(36)` | FK to `documents.id`. |
| `publisher_id` | `VARCHAR(36)` | FK to `publishers.id`. |
| `notes` | `TEXT` | Attribution notes. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

Constraint notes: unique on `(document_id, publisher_id)`.

### tags

Tag lookup table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `name` | `TEXT` | Tag name. |
| `name_hash` | `VARCHAR(64)` | Generated stored SHA-256 hash of normalized `name`. Unique. |
| `notes` | `TEXT` | Scope or descriptive notes. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

Query note: indexed on `name(191)` for name lookups.

### collections

Collection definitions. Each collection has one required canonical tag and may have additional qualifier tags through `collection_qualifiers`.
Membership is calculated live: a document qualifies when it has any qualifier tag or a normalized qualifier name matches a whole value in `dc_coverage_cultural`, `dc_subject`, `dc_subject_unesco`, `long_tail_keywords`, or `seo_keywords`.
List-valued metadata matches one complete list item, and matching is case-insensitive.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. UUID string. |
| `tag_id` | `VARCHAR(36)` | FK to `tags.id`. Unique canonical qualifier; also supplies the collection name. |
| `fedora_node_id` | `VARCHAR(255)` | Optional Islandora/Fedora collection node ID, shown as Library ID in the Dashboard. Required before a member can become Ready for Library. |
| `notes` | `TEXT` | Optional collection note. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

Constraint notes: unique on `tag_id`; deleting the referenced tag cascades to this row.

### collection_qualifiers

Additional qualifier tags for a collection. The canonical tag remains in `collections.tag_id` and is not duplicated here.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. UUID string. |
| `collection_id` | `VARCHAR(36)` | FK to `collections.id`; deleting the collection cascades to this link. |
| `tag_id` | `VARCHAR(36)` | FK to `tags.id`; deleting the tag cascades to this link. The tag can also qualify other collections. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

Constraint notes: unique on `(collection_id, tag_id)`.

### document_to_tags

Document-to-tag association table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `document_id` | `VARCHAR(36)` | FK to `documents.id`. |
| `tag_id` | `VARCHAR(36)` | FK to `tags.id`. |
| `notes` | `TEXT` | Assignment note. |
| `created_at` | `DATETIME` | Row creation time. |

Constraint notes: unique on `(document_id, tag_id)`.

### metadata

Lookup table for document metadata field names.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `name` | `TEXT` | Metadata field name. |
| `name_hash` | `VARCHAR(64)` | Generated stored SHA-256 hash of normalized `name`. Unique. |
| `notes` | `TEXT` | Field notes/description. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

Query note: indexed on `name(191)` for direct metadata-name lookup.

### document_to_metadata

Document metadata values.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `document_id` | `VARCHAR(36)` | FK to `documents.id`. |
| `metadata_id` | `VARCHAR(36)` | FK to `metadata.id`. |
| `value` | `JSON` | Typed metadata payload, stored as `{"value": <typed_value>}`. |
| `value_type` | `VARCHAR(50)` | Logical type of the inner typed value in `value`. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

Constraint notes: unique on `(document_id, metadata_id)`.

Query note: this table is the main source for file path, URL, MIME type, rights, descriptive metadata, and many enrichment outputs that are not first-class columns on `documents`.

### batch_metadata

Lookup table for batch metadata field names.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `name` | `TEXT` | Batch metadata field name. |
| `name_hash` | `VARCHAR(64)` | Generated stored SHA-256 hash of normalized `name`. Unique. |
| `notes` | `TEXT` | Field notes/description. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

### batches

Core batch/process-run records.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `id_legacy` | `VARCHAR(255)` | Source-system batch identifier. Indexed. |
| `name` | `TEXT` | Optional batch label. |
| `name_hash` | `VARCHAR(64)` | Generated stored SHA-256 hash of normalized `name`. Unique when present. |
| `processing_details` | `JSON` | Core processing details on the batch row. Non-null with default `{}`. Rollback stores document-link cost at `rollback.document_cost_total` and its capture time at `rollback.document_cost_captured_at`. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |
| `started_at` | `DATETIME` | Batch start time. |
| `completed_at` | `DATETIME` | Batch completion time. |
| `last_processed` | `DATETIME` | Last processing datetime. |
| `started_by` | `VARCHAR(255)` | Initiator name/process label. |
| `lifecycle_status` | `VARCHAR(32)` | Durable workflow state: `draft`, `queued`, `running`, `complete`, `published`, `failed`, `publication_locked`, `archive`, and rollback states. |
| `publication_target` | `VARCHAR(64)` | Provider identifier for the publication endpoint; currently `fedora`. |

Query note: batch-specific metrics and registry-derived attributes often live in `batch_to_batches_metadata`, not as top-level columns here.

### publication_attempts

Durable identity for a Ready for Library selected-document publication. The batch's `processing_details.pipeline` stores the fixed publication workflow and selected source IDs; this row ties that batch to a stable operation for retries.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. UUID string. |
| `operation_id` | `VARCHAR(255)` | Unique submission identity used for idempotent replay. |
| `batch_id` | `VARCHAR(36)` | Unique FK to `batches.id`; deleting the batch is restricted while this row exists. |
| `requested_by` | `VARCHAR(255)` | Authenticated requester identity. |
| `created_at` | `DATETIME` | Row creation time. |

### publication_source_claims

One reservation per source document selected for an active publication attempt. Claims prevent another active attempt from selecting the same source, even when the selections span original batches.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. UUID string. |
| `attempt_id` | `VARCHAR(36)` | FK to `publication_attempts.id`; deleting the attempt is restricted while claims exist. |
| `source_document_id` | `VARCHAR(36)` | Unique FK to `documents.id`; deleting a claimed source is restricted. |
| `created_at` | `DATETIME` | Row creation time. |

The attempt remains after claims are released. A claim is released only after confirmed complete Fedora publication or successful pre-Fedora rollback; failed or uncertain outcomes retain it for recovery.

### pipeline_queue_items

Durable queue entries for the combined pipeline server.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. UUID string. |
| `stage` | `VARCHAR(64)` | Target stage/service key such as `data_ingester` or `document_splitter`. Indexed. |
| `batch_id` | `VARCHAR(255)` | Batch identifier associated with the queued work. Indexed. |
| `payload` | `JSON` | Original accepted trigger payload stored for worker execution and replay. |
| `status` | `VARCHAR(32)` | Queue lifecycle status such as `queued`, `in_progress`, `retry_pending`, `completed`, or `failed`. Indexed. |
| `attempt_count` | `INT` | Number of worker attempts made for this queue item. |
| `queued_at` | `DATETIME` | Time the queue item was created. |
| `claimed_at` | `DATETIME` | Time the worker claimed the queue item for execution. |
| `completed_at` | `DATETIME` | Time the queue item reached a terminal state. |
| `cancelled_at` | `DATETIME` | Time a queued item was cancelled during rollback. |
| `cancel_reason` | `TEXT` | Operator or coordinator reason for cancellation. |
| `error_type` | `VARCHAR(255)` | Exception type or failure category recorded on worker failure. |
| `error_message` | `TEXT` | Failure detail recorded on worker failure. |
| `callback_delivery` | `JSON` | Callback delivery result recorded after completion, including HTTP status and notification time when available. |

Query note: this table intentionally has no foreign keys.
It is a durable orchestration/control table for the combined pipeline worker rather than a lineage or metadata table.

### batch_rollbacks

Durable rollback operation records.
The batch row, processing details, costs, rollback record, and mutation ledger remain historical; batch-created operational rows are purged after compensation succeeds.
The retained batch is renamed with an `<original-name>-rolled-back-<rollback-number>` suffix.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `batch_id` | `VARCHAR(36)` | Unique FK to `batches.id`; one rollback record per batch. |
| `original_batch_name` | `TEXT` | Batch name before successful rollback renaming. |
| `rollback_number` | `INT` | Monotonic suffix number for the original batch name. |
| `requested_by` | `VARCHAR(255)` | Operator or calling application identity. |
| `reason` | `TEXT` | Optional operator explanation. |
| `idempotency_key` | `VARCHAR(255)` | Optional unique request key. |
| `status` | `VARCHAR(32)` | Rollback operation state, including `requested`, `rollback_in_progress`, `rolled_back`, and `failed`. |
| `requested_at` / `started_at` / `completed_at` / `resolved_at` | `DATETIME` | Rollback lifecycle timestamps. |
| `restored_count` / `deleted_count` / `cancelled_count` / `conflict_count` / `failed_count` | `INT` | Counts for restored rows, purged rows/artifacts, cancelled queue items, conflicts, and failures. |
| `last_failure` | `TEXT` | Latest failure or operator-resolution detail. |
| `callback_delivery` | `JSON` | Persisted result of notifying the Dashboard after rollback completion. |
| `created_at` / `updated_at` | `DATETIME` | Row creation and update times. |

### batch_mutations

Mutation journal for reversible database changes and batch-owned Google Drive artifacts.
Created documents and related operational rows are purged during rollback; pre-existing rows are restored from before-images only when their after-value fingerprints still match.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `batch_id` / `rollback_id` | `VARCHAR(36)` | Batch FK and optional rollback FK. |
| `execution_order` | `INT` | Durable order within a batch, unique with `batch_id`, for reverse compensation. |
| `stage` / `pass_number` | `VARCHAR(64)` / `INT` | Execution context that caused the mutation. |
| `resource_type` / `resource_id` | `VARCHAR(64)` / `VARCHAR(255)` | Mutated resource identity. |
| `operation` | `VARCHAR(64)` | Insert, update, delete, create-file, or similar operation. |
| `before_snapshot` | `JSON` | Database before-image where applicable. |
| `after_fingerprint` | `VARCHAR(128)` | Fingerprint used for conflict-safe compensation. |
| `rollback_action` | `VARCHAR(255)` | Inverse operation to execute. |
| `status` | `VARCHAR(32)` | Journal state such as `planned`, `applied`, `rolled_back`, `conflict`, or `unknown`. |
| `attempts` | `INT` | Number of compensation or recovery attempts. |
| `planned_at` / `applied_at` / `rolled_back_at` / `created_at` / `updated_at` | `DATETIME` | Mutation lifecycle timestamps. |
| `last_error` | `TEXT` | Latest compensation or recovery failure. |

### batch_external_operations

Durable intents for external provider operations.
An operation may remain unresolved after a process crash; recovery reconciles it by idempotency key before rollback is allowed to complete.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `batch_id` | `VARCHAR(36)` | FK to `batches.id`. |
| `stage` / `provider` / `operation` | `VARCHAR(64)` | Originating stage, provider, and operation type. |
| `resource_type` | `VARCHAR(64)` | External resource category, such as `google_drive_file`. |
| `idempotency_key` | `VARCHAR(255)` | Unique key reused after worker restart. |
| `request` | `JSON` | Non-secret request metadata needed for reconciliation. |
| `external_ids` | `JSON` | Provider IDs discovered or created by the operation. |
| `status` | `VARCHAR(32)` | `planned`, `executing`, `applied`, `uncertain`, `failed`, or `compensated`. |
| `attempts` | `INT` | Number of provider attempts. |
| `planned_at` / `started_at` / `applied_at` / `completed_at` / `created_at` / `updated_at` | `DATETIME` | External operation lifecycle timestamps. |
| `last_error` | `TEXT` | Latest provider or recovery failure. |
| `next_recovery_at` | `DATETIME` | Earliest time for the next provider reconciliation attempt; used for bounded backoff. |

### fedora_removal_requests

Durable audit record for an authenticated Dashboard request to remove one or more Fedora publications. The idempotency key is unique per submission; each document's progress is stored separately in `fedora_removal_items`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `requested_by` | `VARCHAR(255)` | Authenticated Dashboard user's email. |
| `idempotency_key` | `VARCHAR(255)` | Unique key for request submission retries. |
| `status` | `VARCHAR(32)` | Aggregate request status, derived from its independently processed items. |
| `requested_at` / `started_at` / `completed_at` | `DATETIME` | Request lifecycle timestamps. |
| `last_failure` | `TEXT` | Most recently recorded item failure. |
| `created_at` / `updated_at` | `DATETIME` | Row creation and update times. |

### fedora_removal_items

Durable per-document snapshot and progress record. The item retains publication, source, batch, Fedora, and generated Drive identities as audit values; only `request_id` is a foreign key.
The publication document is deleted after successful restoration, while this audit row remains. The original batch and source history are not modified.

| Column | Type | Notes |
| --- | --- | --- |
| `id` / `request_id` | `VARCHAR(36)` | Primary key and FK to `fedora_removal_requests.id`. |
| `document_id` / `publication_document_id` / `source_candidate_document_id` | `VARCHAR(36)` | Selected Library row and captured publication/source lineage IDs; retained as audit values. |
| `source_state` | `VARCHAR(64)` | Captured pre-Fedora state restored after external cleanup succeeds. |
| `original_batch_id` | `VARCHAR(36)` | Batch audit snapshot; not a foreign key and never changed by removal. |
| `fedora_node_id` / `fedora_url` / `fedora_media_id` | — | Persisted Fedora target identity used for deletion and reconciliation. |
| `submission_file_id` / `submission_folder_id` / `submission_parent_folder_id` / `workbench_csv_file_id` | — | Generated Drive artifact IDs and original parent used to verify quarantine. |
| `status` | `VARCHAR(32)` | Item state: `requested`, `in_progress`, `failed`, `needs_attention`, or `completed`. |
| `fedora_delete_status` / `drive_quarantine_status` / `restoration_status` | `VARCHAR(32)` | Durable step progress; provider outcomes distinguish pending, in progress, succeeded, failed, and unknown. |
| `error_type` / `error_message` | — | Latest item failure detail. |
| `last_retry_by` / `last_retry_at` | — | Operator and time for the latest explicit retry. |
| `requested_at` / `started_at` / `completed_at` | `DATETIME` | Item lifecycle timestamps. |
| `created_at` / `updated_at` | `DATETIME` | Row creation and update times. |

The worker processes each item independently and resumes unfinished steps after restart. The item's `updated_at` timestamp acts as a five-minute processing lease so another worker cannot claim active work.
It restores the source candidate only after Fedora deletion and Drive quarantine are verified.
Removal does not reopen a batch; after any successful Fedora ingestion, the batch remains ineligible for whole-batch rollback.

### pipeline_worker_leases

Singleton durable lease that enforces one active batch across worker processes and restarts.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Singleton key, initialized as `pipeline-worker`. |
| `active_batch_id` | `VARCHAR(36)` | Current batch holding the worker slot. |
| `lease_token` | `VARCHAR(255)` | Token used for ownership and recovery checks. |
| `acquired_at` / `heartbeat_at` / `released_at` | `DATETIME` | Lease lifecycle and recovery timestamps. |

### batch_to_batches_metadata

Batch metadata values.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `batch_id` | `VARCHAR(36)` | FK to `batches.id`. |
| `batch_metadata_id` | `VARCHAR(36)` | FK to `batch_metadata.id`. |
| `value` | `JSON` | Typed metadata payload, stored as `{"value": <typed_value>}`. |
| `value_type` | `VARCHAR(50)` | Logical type of the inner typed value in `value`. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

Constraint notes: unique on `(batch_id, batch_metadata_id)`.

### document_to_batches

Document-to-batch association table with per-document batch metrics.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `document_id` | `VARCHAR(36)` | FK to `documents.id`. |
| `batch_id` | `VARCHAR(36)` | FK to `batches.id`. |
| `added_at` | `DATETIME` | Association creation time. |
| `batch_origin` | `TEXT` | Source-side batch/origin value for this document. |
| `cost` | `DECIMAL(12,2)` | Per-document cost within the batch. |
| `processing_time_seconds` | `INT` | Per-document processing time. |
| `ocr_quality_low` | `BOOLEAN` | Low-quality OCR flag. |
| `ocr_quality_medium` | `BOOLEAN` | Medium-quality OCR flag. |
| `processing_details` | `JSON` | Per-document processing details for service passes. Non-null with default `{}`. |

Constraint notes: unique on `(document_id, batch_id)`.

### version_groups

Version families, one row per canonical group.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `canonical_document_id` | `VARCHAR(36)` | FK to `documents.id`. Unique. |
| `notes` | `TEXT` | Group-level note. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

Query note: this table defines the family; the member documents live in `document_versions`.

### document_versions

Document membership in a version family.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `document_id` | `VARCHAR(36)` | FK to `documents.id`. |
| `version_group_id` | `VARCHAR(36)` | FK to `version_groups.id`. |
| `notes` | `TEXT` | Version note. |
| `changes_summary` | `TEXT` | Summary of changes relative to canonical. |
| `similarity_score` | `FLOAT` | Similarity to the canonical document for content-dedup families. Typically `NULL` for the canonical member row. |
| `analyzed_at` | `BIGINT` | Unix timestamp. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

Constraint notes: unique on `(document_id, version_group_id)`.

### edit_history

Generic audit log for edited entities.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `entity_id` | `VARCHAR(36)` | Identifier of the edited row. No FK. |
| `entity_table` | `VARCHAR(255)` | Name of the edited table. |
| `previous_value` | `JSON` | Prior value snapshot. |
| `new_value` | `JSON` | New value snapshot. |
| `editor_email` | `VARCHAR(255)` | Editor identifier. |
| `edit_summary` | `VARCHAR(255)` | Summary of the edit. |
| `edited_at` | `DATETIME` | Edit datetime. |

Query note: because this table is generic, analysts typically filter by `entity_table` first.

### drive_exclusion_review_items

Dashboard-local index of one configured Google Drive root for the `Exclusion Review` workspace.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `VARCHAR(36)` | Primary key. |
| `root_drive_id` | `VARCHAR(255)` | Configured root folder that scopes this index row. |
| `drive_id` | `VARCHAR(255)` | Google Drive file or folder identifier. |
| `parent_drive_id` | `VARCHAR(255)` | Direct parent folder ID, nullable for the configured root row. |
| `item_type` | `VARCHAR(16)` | `folder` or `file`. |
| `name` | `VARCHAR(1024)` | Current Drive item name. |
| `mime_type` | `VARCHAR(255)` | Drive mime type. |
| `drive_url` | `TEXT` | Canonical open-in-Drive URL. |
| `path` | `TEXT` | Serialized ancestor chain from the configured root through the direct parent. |
| `depth` | `INT` | Depth from the configured root. |
| `explicit_review_decision` | `VARCHAR(16)` | Direct reviewer decision on this exact item, if any. |
| `explicit_reviewed_by_email` | `VARCHAR(255)` | Reviewer email for the direct decision. |
| `explicit_reviewed_at` | `DATETIME` | Timestamp for the direct decision. |
| `effective_ancestor_drive_id` | `VARCHAR(255)` | Nearest marked ancestor folder currently governing this row, if any. |
| `effective_ancestor_decision` | `VARCHAR(16)` | Cached inherited include or exclude state from that ancestor. |
| `effective_ancestor_reviewed_at` | `DATETIME` | Timestamp of the governing ancestor decision. |
| `subtree_index_status` | `VARCHAR(16)` | Branch indexing state such as `pending`, `syncing`, `complete`, or `error`. |
| `discovered_at` | `DATETIME` | When the item first entered the local index. |
| `last_synced_at` | `DATETIME` | Last successful Drive reconciliation datetime. |
| `last_sync_error` | `TEXT` | Last recorded branch sync error, if any. |
| `created_at` | `DATETIME` | Row creation time. |
| `updated_at` | `DATETIME` | Row update time. |

Constraint notes: unique on `(root_drive_id, drive_id)`.
