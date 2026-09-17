/** Generated from contracts/batch-lifecycle-statuses.json; do not edit manually. */
export const GENERATED_BATCH_LIFECYCLE_STATUSES = {
  DRAFT: 'draft',
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETE: 'complete',
  PUBLISHED: 'published',
  FAILED: 'failed',
  PUBLICATION_LOCKED: 'publication_locked',
  ARCHIVE: 'archive',
  ROLLBACK_REQUESTED: 'rollback_requested',
  DRAINING: 'draining',
  ROLLBACK_IN_PROGRESS: 'rollback_in_progress',
  ROLLBACK_FAILED: 'rollback_failed',
  ROLLED_BACK: 'rolled_back',
} as const

export type GeneratedBatchLifecycleStatus =
  (typeof GENERATED_BATCH_LIFECYCLE_STATUSES)[keyof typeof GENERATED_BATCH_LIFECYCLE_STATUSES]
