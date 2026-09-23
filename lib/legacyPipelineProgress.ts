import type { TimelineStep } from '@molecules/PipelineTimelineGroup'
import { FEDORA_INGESTER_SERVICE, getPipelineServiceDefinition } from '@constants/pipeline'
import { LEGACY_IMPORT_STATUS_HISTORICAL } from '@constants/legacyImport'
import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import { PIPELINE_STAGE_STATUSES } from '@constants/pipelineStageStatuses'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

function fedoraRuntimeStatus(
  lifecycleStatus: string | null | undefined,
  fedoraStatus: string | null | undefined,
): TimelineStep['status'] {
  if (lifecycleStatus === GENERATED_BATCH_LIFECYCLE_STATUSES.PUBLISHED) {
    return PIPELINE_STAGE_STATUSES.COMPLETED
  }

  switch (fedoraStatus) {
    case PIPELINE_STAGE_STATUSES.PUBLISHED:
      return PIPELINE_STAGE_STATUSES.COMPLETED
    case PIPELINE_STAGE_STATUSES.FAILED:
    case PIPELINE_STAGE_STATUSES.ERROR:
      return PIPELINE_STAGE_STATUSES.FAILED
    case PIPELINE_STAGE_STATUSES.RUNNING:
    case PIPELINE_STAGE_STATUSES.IN_PROGRESS:
    case PIPELINE_STAGE_STATUSES.PROCESSING:
      return PIPELINE_STAGE_STATUSES.RUNNING
    case PIPELINE_STAGE_STATUSES.QUEUED:
      return PIPELINE_STAGE_STATUSES.QUEUED
    default:
      return PIPELINE_STAGE_STATUSES.PENDING
  }
}

export function buildLegacyPipelineSteps(
  batch: Pick<ProcessBatchStatus, 'legacyImportStatus' | 'lifecycleStatus' | 'fedoraIngester'>,
): TimelineStep[] {
  return [
    {
      label: 'Legacy processing',
      status:
        batch.legacyImportStatus === LEGACY_IMPORT_STATUS_HISTORICAL
          ? PIPELINE_STAGE_STATUSES.COMPLETED
          : PIPELINE_STAGE_STATUSES.PENDING,
    },
    {
      label: getPipelineServiceDefinition(FEDORA_INGESTER_SERVICE).label,
      status: fedoraRuntimeStatus(batch.lifecycleStatus, batch.fedoraIngester?.status),
    },
  ]
}
