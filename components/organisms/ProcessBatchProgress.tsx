'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { Alert, Stack } from '@mui/material'

import { PROCESS_EVENTS_PATH } from '@constants/paths'
import { isPipelineBatchTerminal } from '@lib/pipelineExecution'
import { BatchExecutionActions } from '@organisms/BatchExecutionActions'
import { BatchProcessingDetails } from '@organisms/BatchProcessingDetails'
import { ProcessBatchStatusCard } from '@molecules/ProcessBatchStatusCard'
import type { BatchProperty } from 'types/batches'
import type { PipelineQueueAttemptSummary } from 'types/pipelineExecution'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

interface ProcessBatchProgressProps {
  initialBatch: ProcessBatchStatus
  queueAttempts?: PipelineQueueAttemptSummary[]
  processingDetails?: readonly BatchProperty[]
  onRollbackRequested?: () => void
  showExecutionActions?: boolean
}

export function ProcessBatchProgress({
  initialBatch,
  queueAttempts = [],
  processingDetails,
  onRollbackRequested,
  showExecutionActions = true,
}: ProcessBatchProgressProps): ReactElement {
  const [batch, setBatch] = useState(initialBatch)
  const [streamVersion, setStreamVersion] = useState(0)
  const [streamError, setStreamError] = useState<string | null>(null)

  useEffect(() => {
    setBatch(initialBatch)
  }, [initialBatch])

  useEffect(() => {
    const eventSource = new EventSource(`${PROCESS_EVENTS_PATH}?batchId=${encodeURIComponent(initialBatch.batchId)}`)
    let closedByTerminalStatus = false

    eventSource.addEventListener('batch_status', (event) => {
      const message = event as MessageEvent<string>
      const nextBatch = JSON.parse(message.data) as ProcessBatchStatus
      setBatch(nextBatch)
      setStreamError(null)

      if (isPipelineBatchTerminal(nextBatch)) {
        closedByTerminalStatus = true
        eventSource.close()
      }
    })

    eventSource.addEventListener('batch_missing', () => {
      setStreamError('Live updates stopped because the batch could not be found.')
      eventSource.close()
    })

    eventSource.onerror = () => {
      if (closedByTerminalStatus) {
        return
      }
      setStreamError('Live updates disconnected. Refresh the page to reload the latest batch state.')
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [initialBatch.batchId, streamVersion])

  function reconnectAfterExecution(): void {
    setStreamError(null)
    setStreamVersion((current) => current + 1)
  }

  const executionActions = showExecutionActions ? (
    <BatchExecutionActions
      batch={batch}
      currentExecution={batch.currentExecution}
      queueAttempts={queueAttempts}
      onExecutionQueued={reconnectAfterExecution}
    />
  ) : null

  return (
    <Stack spacing={2.5}>
      {streamError ? <Alert severity={'warning'}>{streamError}</Alert> : null}
      <ProcessBatchStatusCard
        batch={batch}
        onRollbackRequested={onRollbackRequested}
        executionActions={executionActions}
      />
      {processingDetails ? <BatchProcessingDetails properties={processingDetails} /> : null}
    </Stack>
  )
}
