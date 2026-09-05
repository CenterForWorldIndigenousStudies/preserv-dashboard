/** Generated from contracts/batch-lifecycle-statuses.json; do not edit manually. */
export const GENERATED_BATCH_LIFECYCLE_STATUSES = {
  DRAFT: 'draft',
  QUEUED: 'queued',
  RUNNING: 'running',
  FAILED: 'failed',
  PUBLICATION_LOCKED: 'publication_locked',
  COMPLETE: 'complete',
  ARCHIVE: 'archive',
  ROLLBACK_REQUESTED: 'rollback_requested',
  DRAINING: 'draining',
  REVERTING: 'reverting',
  ROLLBACK_FAILED: 'rollback_failed',
  REVERTED: 'reverted',
} as const

export type GeneratedBatchLifecycleStatus =
  (typeof GENERATED_BATCH_LIFECYCLE_STATUSES)[keyof typeof GENERATED_BATCH_LIFECYCLE_STATUSES]
