'use client'

import { useMemo, useState } from 'react'
import { Alert, Button, Stack } from '@mui/material'

import { PipelineExecutionDialog } from '@molecules/PipelineExecutionDialog'
import { REPROCESSING_EXECUTION_STAGE_ORDER } from '@lib/reprocessingDrafts'
import type { PipelineExecutionMode, PipelineQueueAttemptSummary } from 'types/pipelineExecution'
import type { CallbackStageKey, ProcessBatchStatus } from 'types/pipelineContracts'
import { BATCH_LIFECYCLE_STATUSES } from '@constants/batchLifecycleStatuses'
import { BATCH_PUBLICATION_STATUSES } from '@constants/batchPublicationStatuses'

interface BatchExecutionActionsProps {
  batch: ProcessBatchStatus | null
  currentExecution?: ProcessBatchStatus['currentExecution']
  queueAttempts?: PipelineQueueAttemptSummary[]
  onExecutionQueued?: () => void
}

const STAGE_PROPERTIES: Record<CallbackStageKey, keyof ProcessBatchStatus> = {
    ingester: 'ingester',
    document_splitter: 'documentSplitter',
    page_rotator: 'pageRotator',
    ocr_processor: 'ocrProcessor',
    content_dedup: 'contentDedup',
    metadata_extractor: 'metadataExtractor',
    metadata_validator: 'metadataValidator',
    rights_determinator: 'rightsDeterminator',
    fedora_ingester: 'fedoraIngester',
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
    return REPROCESSING_EXECUTION_STAGE_ORDER.find((stage) => {
      const value = batch[STAGE_PROPERTIES[stage]]
      return value && typeof value === 'object' && 'status' in value && value.status === 'failed'
    }) ?? null
  }, [batch])

  if (!batch) return null
  const published =
    batch.lifecycleStatus === BATCH_LIFECYCLE_STATUSES.PUBLICATION_LOCKED ||
    batch.lifecycleStatus === BATCH_LIFECYCLE_STATUSES.COMPLETE ||
    new Set<string>([
      BATCH_PUBLICATION_STATUSES.PUBLISHED,
      BATCH_PUBLICATION_STATUSES.PUBLICATION_LOCKED,
      BATCH_PUBLICATION_STATUSES.UNKNOWN,
    ]).has(batch.publicationStatus ?? '')
  const reverted = batch.lifecycleStatus === BATCH_LIFECYCLE_STATUSES.REVERTED
  const rerunDisabled = published || reverted

  return (
    <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      {published ? <Alert severity={'info'}>{'This batch has been published. Reprocess its documents into a new batch instead of rerunning it in place.'}</Alert> : null}
      {reverted ? (
        <Alert severity={'info'}>
          {'This batch was rolled back successfully. Rerun from stage is unavailable; start a new batch from the original source instead.'}
        </Alert>
      ) : null}
      {currentExecution?.operationId ? (
        <Alert severity={'info'}>
          {`Current ${currentExecution.executionMode ?? 'pipeline'} operation: ${currentExecution.operationId}${currentExecution.stage ? ` (${currentExecution.stage})` : ''}.`}
        </Alert>
      ) : null}
      {queueAttempts.find((attempt) => attempt.status === 'failed') ? (
        <Alert severity={'error'}>
          {queueAttempts.find((attempt) => attempt.status === 'failed')?.errorMessage ?? 'The latest queue attempt failed.'}
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
          initialStage={mode === 'retry' ? failedStage ?? undefined : undefined}
        />
      ) : null}
    </Stack>
  )
}
