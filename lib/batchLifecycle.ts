import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'

export const ROLLBACK_ELIGIBLE_BATCH_LIFECYCLE_STATUSES = new Set<string>([
  GENERATED_BATCH_LIFECYCLE_STATUSES.QUEUED,
  GENERATED_BATCH_LIFECYCLE_STATUSES.RUNNING,
  GENERATED_BATCH_LIFECYCLE_STATUSES.COMPLETE,
  GENERATED_BATCH_LIFECYCLE_STATUSES.FAILED,
])

export const ROLLBACK_IN_PROGRESS_BATCH_LIFECYCLE_STATUSES = new Set<string>([
  GENERATED_BATCH_LIFECYCLE_STATUSES.ROLLBACK_REQUESTED,
  GENERATED_BATCH_LIFECYCLE_STATUSES.DRAINING,
  GENERATED_BATCH_LIFECYCLE_STATUSES.ROLLBACK_IN_PROGRESS,
  GENERATED_BATCH_LIFECYCLE_STATUSES.ROLLBACK_FAILED,
])

export function canRequestBatchRollback(lifecycleStatus: string | null | undefined): boolean {
  return ROLLBACK_ELIGIBLE_BATCH_LIFECYCLE_STATUSES.has(lifecycleStatus ?? '')
}

export function isBatchPublicationLocked(lifecycleStatus: string | null | undefined): boolean {
  return lifecycleStatus === GENERATED_BATCH_LIFECYCLE_STATUSES.PUBLICATION_LOCKED
}

export function isBatchPublished(lifecycleStatus: string | null | undefined): boolean {
  return lifecycleStatus === GENERATED_BATCH_LIFECYCLE_STATUSES.PUBLISHED
}

export const BATCH_PUBLICATION_STATES = {
  NOT_STARTED: 'not_started',
  LOCKED: 'locked',
  PUBLISHED: 'published',
} as const

export type BatchPublicationState = (typeof BATCH_PUBLICATION_STATES)[keyof typeof BATCH_PUBLICATION_STATES]

export function getBatchPublicationState(
  lifecycleStatus: string | null | undefined,
  fedoraIngesterStatus?: unknown,
): BatchPublicationState {
  if (isBatchPublished(lifecycleStatus)) {
    return BATCH_PUBLICATION_STATES.PUBLISHED
  }

  if (isBatchPublicationLocked(lifecycleStatus) && typeof fedoraIngesterStatus === 'string') {
    return BATCH_PUBLICATION_STATES.LOCKED
  }

  return BATCH_PUBLICATION_STATES.NOT_STARTED
}
