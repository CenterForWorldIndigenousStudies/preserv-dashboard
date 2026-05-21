export const REVIEW_QUEUE_SORT_FIELDS = [
  'id',
  'name',
  'validation_status',
  'validator_name',
  'validator_email',
  'needs_review',
  'sensitive',
] as const

export const REVIEW_QUEUE_DEFAULT_VALIDATION_STATUSES = [
  'NEEDS_REVIEW',
  'METADATA_ISSUES',
  'FORMAT_ERRORS',
] as const
