export const BATCH_ROLLBACK_STATUSES = {
  REQUESTED: 'requested',
  DRAINING: 'draining',
  ROLLBACK_IN_PROGRESS: 'rollback_in_progress',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back',
} as const

export type BatchRollbackStatus = (typeof BATCH_ROLLBACK_STATUSES)[keyof typeof BATCH_ROLLBACK_STATUSES]
