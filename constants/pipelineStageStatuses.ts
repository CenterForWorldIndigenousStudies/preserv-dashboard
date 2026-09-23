export const PIPELINE_STAGE_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REVIEW_NEEDED: 'review_needed',
  PUBLISHED: 'published',
  ERROR: 'error',
  IN_PROGRESS: 'in_progress',
  PROCESSING: 'processing',
} as const

export type PipelineStageStatus = (typeof PIPELINE_STAGE_STATUSES)[keyof typeof PIPELINE_STAGE_STATUSES]

export type PipelineStepRuntimeStatus =
  | typeof PIPELINE_STAGE_STATUSES.PENDING
  | typeof PIPELINE_STAGE_STATUSES.QUEUED
  | typeof PIPELINE_STAGE_STATUSES.RUNNING
  | typeof PIPELINE_STAGE_STATUSES.COMPLETED
  | typeof PIPELINE_STAGE_STATUSES.FAILED
  | typeof PIPELINE_STAGE_STATUSES.REVIEW_NEEDED
