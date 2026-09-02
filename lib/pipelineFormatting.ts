import type { ProcessBatchStatus } from 'types/pipelineContracts'

export function formatReviewWarning(count: number): string | null {
  if (count <= 0) {
    return null
  }

  return count === 1 ? '1 document needs review' : `${count} documents need review`
}

export function formatExecutionLabel(batch: ProcessBatchStatus): string | null {
  const execution = batch.currentExecution
  if (!execution?.executionMode) {
    return null
  }

  const labels: Record<string, string> = {
    normal: 'Initial run',
    retry: 'Retry',
    rerun: 'Rerun',
    reprocess: 'Reprocess',
  }
  const label = labels[execution.executionMode] ?? execution.executionMode
  return execution.stage ? `${label} from ${execution.stage}` : label
}
