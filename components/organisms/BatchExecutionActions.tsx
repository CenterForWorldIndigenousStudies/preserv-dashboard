'use client'

import { useMemo, useState } from 'react'
import { Alert, Button, Stack } from '@mui/material'

import { PipelineExecutionDialog } from '@molecules/PipelineExecutionDialog'
import type { PipelineExecutionMode, PipelineQueueAttemptSummary } from 'types/pipelineExecution'
import type { CallbackStageKey, ProcessBatchStatus } from 'types/pipelineContracts'

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

const STAGES: CallbackStageKey[] = [
  'document_splitter',
  'page_rotator',
  'ocr_processor',
  'content_dedup',
  'metadata_extractor',
  'metadata_validator',
  'rights_determinator',
  'fedora_ingester',
]

export function BatchExecutionActions({
  batch,
  currentExecution,
  queueAttempts = [],
  onExecutionQueued,
}: BatchExecutionActionsProps): React.ReactElement | null {
  const [mode, setMode] = useState<PipelineExecutionMode | null>(null)
  const failedStage = useMemo(() => {
    if (!batch) return null
    return STAGES.find((stage) => {
      const value = batch[STAGE_PROPERTIES[stage]]
      return value && typeof value === 'object' && 'status' in value && value.status === 'failed'
    }) ?? null
  }, [batch])

  if (!batch) return null
  const published = ['published', 'publication_locked', 'unknown'].includes(batch.publicationStatus ?? '')
  const rerunDisabled = published

  return (
    <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      {published ? <Alert severity={'info'}>{'This batch has been published. Reprocess its documents into a new batch instead of rerunning it in place.'}</Alert> : null}
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
