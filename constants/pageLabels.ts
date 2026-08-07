export const PAGE_LABELS = {
  dashboard: 'Dashboard',
  documents: 'Documents',
  process: 'Process',
  batches: 'Batches',
  exclusionReview: 'Exclusion Review',
  reviewQueue: 'Review Queue',
  readyForLibrary: 'Ready for Library',
  library: 'Library',
  collections: 'Collections',
  tags: 'Tags',
  reports: 'Reports',
  db: 'DB',
  componentLibrary: 'Component Library',
  processingFailures: 'Processing Failures',
  documentDetail: 'Document Detail',
} as const

export type PageLabel = (typeof PAGE_LABELS)[keyof typeof PAGE_LABELS]
