import type { TimelineStep } from '@molecules/PipelineTimelineGroup'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

function publicationStatusToRuntimeStatus(status: string | null | undefined): TimelineStep['status'] {
  switch (status) {
    case 'published':
      return 'completed'
    case 'failed':
    case 'error':
      return 'failed'
    case 'running':
    case 'in_progress':
    case 'processing':
      return 'running'
    case 'queued':
      return 'queued'
    default:
      return 'pending'
  }
}

export function buildLegacyPipelineSteps(batch: Pick<ProcessBatchStatus, 'legacyImportStatus' | 'publicationStatus'>): TimelineStep[] {
  return [
    {
      label: 'Legacy processing',
      status: batch.legacyImportStatus === 'historical' ? 'completed' : 'pending',
    },
    {
      label: 'Fedora Ingester',
      status: publicationStatusToRuntimeStatus(batch.publicationStatus),
    },
  ]
}
