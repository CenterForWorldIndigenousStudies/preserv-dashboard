import { BATCHES_PATH, READY_FOR_LIBRARY_PATH, REVIEW_QUEUE_PATH } from '@constants/paths'
import { hasTerminalPipelineFailure, isPipelineBatchTerminal } from '@lib/pipelineExecution'
import { getProcessBatchStatuses } from '@lib/processBatches'
import { getNeedsReviewDocumentsCount, getReadyForLibraryDocuments } from '@lib/queries/queries'

export interface DashboardKpiMetric {
  title: string
  value: number
  href: string
}

function countActiveBatches(batches: Parameters<typeof hasTerminalPipelineFailure>[0][]): number {
  return batches.filter((batch) => {
    if (hasTerminalPipelineFailure(batch)) {
      return false
    }

    if (isPipelineBatchTerminal(batch)) {
      return false
    }

    return true
  }).length
}

export async function getDashboardKpiMetrics(): Promise<DashboardKpiMetric[]> {
  const [needsReviewCount, readyForLibraryResult, batches] = await Promise.all([
    getNeedsReviewDocumentsCount(),
    getReadyForLibraryDocuments(),
    getProcessBatchStatuses(50),
  ])

  return [
    {
      title: 'Needs Review',
      value: needsReviewCount,
      href: REVIEW_QUEUE_PATH,
    },
    {
      title: 'Ready for Library',
      value: readyForLibraryResult.total,
      href: READY_FOR_LIBRARY_PATH,
    },
    {
      title: 'Active Batches',
      value: countActiveBatches(batches),
      href: BATCHES_PATH,
    },
  ]
}
