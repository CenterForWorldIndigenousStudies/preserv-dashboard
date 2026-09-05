/** Generated from contracts/batch-publication-statuses.json; do not edit manually. */
export const GENERATED_BATCH_PUBLICATION_STATUSES = {
  NOT_STARTED: 'not_started',
  PUBLICATION_LOCKED: 'publication_locked',
  PUBLISHED: 'published',
  UNKNOWN: 'unknown',
} as const

export type GeneratedBatchPublicationStatus =
  (typeof GENERATED_BATCH_PUBLICATION_STATUSES)[keyof typeof GENERATED_BATCH_PUBLICATION_STATUSES]
