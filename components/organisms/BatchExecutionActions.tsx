'use client'

import { useMemo, useState } from 'react'
import { Alert, Button, Stack } from '@mui/material'

import { PipelineExecutionDialog } from '@molecules/PipelineExecutionDialog'
import { PIPELINE_EXECUTION_STAGE_ORDER } from '@lib/reprocessingDrafts'
import type { PipelineExecutionMode, PipelineQueueAttemptSummary } from 'types/pipelineExecution'
import type { ProcessBatchStatus } from 'types/pipelineContracts'
import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import { isBatchPublicationLocked, isBatchPublished } from '@lib/batchLifecycle'
import { PIPELINE_STAGE_PROPERTIES } from '@constants/pipelineStageProperties'

interface BatchExecutionActionsProps {
  batch: ProcessBatchStatus | null
  currentExecution?: ProcessBatchStatus['currentExecution']
  queueAttempts?: PipelineQueueAttemptSummary[]
  onExecutionQueued?: () => void
}

function getBatchExecutionState(batch: ProcessBatchStatus): {
  processingReadyForLibrary: boolean
  published: boolean
  publicationUnavailable: boolean
  rolledBack: boolean
  rerunDisabled: boolean
} {
  const processingReadyForLibrary = batch.lifecycleStatus === GENERATED_BATCH_LIFECYCLE_STATUSES.COMPLETE
  const published = isBatchPublished(batch.lifecycleStatus)
  const publicationUnavailable = isBatchPublicationLocked(batch.lifecycleStatus)
  const rolledBack = batch.lifecycleStatus === GENERATED_BATCH_LIFECYCLE_STATUSES.ROLLED_BACK

  return {
    processingReadyForLibrary,
    published,
    publicationUnavailable,
    rolledBack,
    rerunDisabled: processingReadyForLibrary || publicationUnavailable || published || rolledBack,
  }
}

export function BatchExecutionActions({
  batch,
  currentExecution,
  queueAttempts = [],
  onExecutionQueued,
}: BatchExecutionActionsProps): React.ReactElement | null {
  const [mode, setMode] = useState<PipelineExecutionMode | null>(null)
  const failedStage = useMemo(() => {
    if (!batch) return null
    return (
      PIPELINE_EXECUTION_STAGE_ORDER.find((stage) => {
        const value = batch[PIPELINE_STAGE_PROPERTIES[stage]]
        return value && typeof value === 'object' && 'status' in value && value.status === 'failed'
      }) ?? null
    )
  }, [batch])

  if (!batch) return null
  const { processingReadyForLibrary, published, publicationUnavailable, rolledBack, rerunDisabled } =
    getBatchExecutionState(batch)

  return (
    <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      {processingReadyForLibrary ? (
        <Alert severity={'success'}>
          {'Processing is complete. This batch is ready for library handoff.'}
        </Alert>
      ) : null}
      {published ? (
        <Alert severity={'info'}>
          {'This batch has been published. Reprocess its documents into a new batch instead of rerunning it in place.'}
        </Alert>
      ) : null}
      {publicationUnavailable ? (
        <Alert severity={'info'}>
          {'This batch is publication-locked. Reprocess its documents into a new batch instead of rerunning it in place.'}
        </Alert>
      ) : null}
      {rolledBack ? (
        <Alert severity={'info'}>
          {
            'This batch was rolled back successfully. Rerun from stage is unavailable; start a new batch from the original source instead.'
          }
        </Alert>
      ) : null}
      {currentExecution?.operationId ? (
        <Alert severity={'info'}>
          {`Current ${currentExecution.executionMode ?? 'pipeline'} operation: ${currentExecution.operationId}${currentExecution.stage ? ` (${currentExecution.stage})` : ''}.`}
        </Alert>
      ) : null}
      {queueAttempts.find((attempt) => attempt.status === 'failed') ? (
        <Alert severity={'error'}>
          {queueAttempts.find((attempt) => attempt.status === 'failed')?.errorMessage ??
            'The latest queue attempt failed.'}
        </Alert>
      ) : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        {failedStage ? (
          <Button variant={'outlined'} onClick={() => setMode('retry')}>
            {'Retry failed stage'}
          </Button>
        ) : null}
        <Button variant={'outlined'} onClick={() => setMode('rerun')} disabled={rerunDisabled}>
          {'Rerun from stage'}
        </Button>
      </Stack>
      {mode ? (
        <PipelineExecutionDialog
          batch={batch}
          mode={mode}
          open
          onClose={() => setMode(null)}
          onExecutionQueued={onExecutionQueued}
          initialStage={mode === 'retry' ? (failedStage ?? undefined) : undefined}
        />
      ) : null}
    </Stack>
  )
}
