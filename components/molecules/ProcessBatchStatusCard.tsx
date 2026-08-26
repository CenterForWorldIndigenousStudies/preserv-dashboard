import type { ReactElement, ReactNode } from 'react'
import { Box, Paper, Stack, Typography } from '@mui/material'

import { PipelineStageStatusBadge } from '@atoms/Badges/PipelineStageStatusBadge'
import { MetadataExtractorOpenAIBatchActions } from '@molecules/MetadataExtractorOpenAIBatchActions'
import { BatchRollbackControl } from '@molecules/BatchRollbackControl'
import { PipelineTimelineCard } from '@molecules/PipelineTimelineCard'
import { ProcessBatchSummaryHeader } from '@molecules/ProcessBatchSummaryHeader'
import { ProcessStageDetailList } from '@molecules/ProcessStageDetailList'
import { ProcessStageDiagnosticsPanel } from '@molecules/ProcessStageDiagnosticsPanel'
import { ProcessStageMetricsGrid } from '@molecules/ProcessStageMetricsGrid'
import type { ProcessBatchStatus, ProcessStageStatus } from 'types/pipelineContracts'

interface ProcessBatchStatusCardProps {
  batch: ProcessBatchStatus
  onRollbackRequested?: () => void
  executionActions?: ReactNode
}

function buildPendingStage(): ProcessStageStatus {
  return {
    status: 'pending',
    mode: null,
    requestId: null,
    requestedByApp: 'preserv-dashboard',
    initiatedAt: null,
    startedAt: null,
    completedAt: null,
    lastTransitionAt: null,
    error: null,
    callbackDeliveryStatus: null,
    callbackNotifiedAt: null,
    callbackReceivedAt: null,
    callbackHttpStatus: null,
    callbackErrorType: null,
    callbackErrorMessage: null,
    processedCount: 0,
    ingestedCount: 0,
    duplicateCount: 0,
    exactDuplicateCount: 0,
    skippedSameOriginCount: 0,
    splitCount: 0,
    childCount: 0,
    passedThroughCount: 0,
    rotatedCount: 0,
    normalizedCount: 0,
    ocrCompletedCount: 0,
    extractedCount: 0,
    metadataValidatedCount: 0,
    rightsDeterminedCount: 0,
    needsReviewCount: 0,
    versionedCount: 0,
    resolvedCount: 0,
    skippedCount: 0,
    reviewNeededCount: 0,
    failedCount: 0,
    currentPass: 1,
    maxPasses: 1,
    completedPasses: [],
    sourceFolderIds: [],
    collectionName: null,
    collectionNotes: null,
    openaiBatchWave1: null,
    openaiBatchWave2: null,
  }
}

function shouldShowPendingMetadataExtractor(batch: ProcessBatchStatus): boolean {
  if (batch.metadataExtractor) {
    return false
  }

  if (batch.pipelineRequestedStages.includes('metadata-extraction')) {
    return true
  }

  return (
    batch.pipelineConfig?.executionPlan.some((step) => step.enabled && step.service === 'metadata-extraction') ?? false
  )
}

function shouldShowPendingOcrProcessor(batch: ProcessBatchStatus): boolean {
  if (batch.ocrProcessor) {
    return false
  }

  if (batch.pipelineRequestedStages.includes('ocr-processor')) {
    return true
  }

  return batch.pipelineConfig?.executionPlan.some((step) => step.enabled && step.service === 'ocr-processor') ?? false
}

function shouldShowPendingMetadataValidator(batch: ProcessBatchStatus): boolean {
  if (batch.metadataValidator) {
    return false
  }

  if (batch.pipelineRequestedStages.includes('metadata-validation')) {
    return true
  }

  return (
    batch.pipelineConfig?.executionPlan.some((step) => step.enabled && step.service === 'metadata-validation') ?? false
  )
}

function shouldShowPendingRightsDeterminator(batch: ProcessBatchStatus): boolean {
  if (batch.rightsDeterminator) {
    return false
  }

  if (batch.pipelineRequestedStages.includes('rights-determinator')) {
    return true
  }

  return (
    batch.pipelineConfig?.executionPlan.some((step) => step.enabled && step.service === 'rights-determinator') ?? false
  )
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function formatReviewWarning(count: number): string | null {
  if (count <= 0) {
    return null
  }

  return count === 1 ? '1 document needs review' : `${count} documents need review`
}

function formatExecutionLabel(batch: ProcessBatchStatus): string | null {
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

function DetailRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
      <Box component={'span'} sx={{ color: 'text.primary', fontWeight: 600 }}>
        {label}:
      </Box>{' '}
      {value}
    </Typography>
  )
}

function StageCard({
  label,
  stage,
  batchId,
  showOpenAIBatchActions = false,
}: {
  label: string
  stage: ProcessStageStatus | null
  batchId?: string
  showOpenAIBatchActions?: boolean
}): ReactElement | null {
  if (!stage) {
    return null
  }

  const reviewWarning = formatReviewWarning(stage.reviewNeededCount)

  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.default' }}>
      <Stack spacing={2}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
          }}
        >
          <Box>
            <Typography variant={'overline'} sx={{ color: 'text.secondary' }}>
              {label}
            </Typography>
            <Typography component={'h3'} variant={'h6'}>
              {label}
            </Typography>
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
          >
            <PipelineStageStatusBadge status={stage.status} />
            {reviewWarning ? (
              <Typography variant={'caption'} sx={{ color: 'warning.main', fontWeight: 600 }}>
                {reviewWarning}
              </Typography>
            ) : null}
          </Stack>
        </Box>

        {showOpenAIBatchActions && batchId ? (
          <MetadataExtractorOpenAIBatchActions
            batchId={batchId}
            canCheckStatus={!!stage.openaiBatchWave1?.openaiBatchId}
            waveOneStatus={stage.openaiBatchWave1?.status ?? null}
          />
        ) : null}
        <ProcessStageMetricsGrid stageLabel={label} stage={stage} />
        <ProcessStageDetailList stage={stage} />
        <ProcessStageDiagnosticsPanel stage={stage} />
      </Stack>
    </Paper>
  )
}

function MetadataExtractorStageCard({
  batch,
  stage,
}: {
  batch: ProcessBatchStatus
  stage: ProcessStageStatus | null
}): ReactElement | null {
  const showOpenAIBatchActions =
    (stage?.mode === 'openai_batch' || batch.pipelineConfig?.metadataExtraction.mode === 'openai_batch') &&
    stage !== null

  return (
    <StageCard
      label={'Metadata Extractor'}
      stage={stage}
      batchId={batch.batchId}
      showOpenAIBatchActions={showOpenAIBatchActions}
    />
  )
}

export function ProcessBatchStatusCard({
  batch,
  onRollbackRequested,
  executionActions,
}: ProcessBatchStatusCardProps): ReactElement {
  const ocrProcessorStage = batch.ocrProcessor ?? (shouldShowPendingOcrProcessor(batch) ? buildPendingStage() : null)
  const metadataExtractorStage =
    batch.metadataExtractor ?? (shouldShowPendingMetadataExtractor(batch) ? buildPendingStage() : null)
  const metadataValidatorStage =
    batch.metadataValidator ?? (shouldShowPendingMetadataValidator(batch) ? buildPendingStage() : null)
  const rightsDeterminatorStage =
    batch.rightsDeterminator ?? (shouldShowPendingRightsDeterminator(batch) ? buildPendingStage() : null)
  const executionLabel = formatExecutionLabel(batch)
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, p: 3 }}>
      <Stack spacing={2.5}>
        <ProcessBatchSummaryHeader
          batchName={batch.batchName ?? ''}
          batchId={batch.batchId}
          startedBy={batch.startedBy}
        />

        <DetailRow label={'Created'} value={formatDateTime(batch.createdAt)} />
        <DetailRow
          label={'Requested Stages'}
          value={batch.pipelineRequestedStages.length > 0 ? batch.pipelineRequestedStages.join(', ') : 'Ingest only'}
        />
        {executionLabel ? <DetailRow label={'Execution'} value={executionLabel} /> : null}
        <DetailRow label={'Lifecycle'} value={batch.lifecycleStatus ?? 'unknown'} />
        <DetailRow label={'Publication'} value={batch.publicationStatus ?? 'unknown'} />
        {batch.rollbackStatus ? (
          <DetailRow
            label={'Rollback'}
            value={[
              batch.rollbackStatus,
              batch.rollbackCounts
                ? `(deleted ${batch.rollbackCounts.deleted}, restored ${batch.rollbackCounts.restored}, cancelled ${batch.rollbackCounts.cancelled}, failed ${batch.rollbackCounts.failed}, conflicts ${batch.rollbackCounts.conflicts})`
                : null,
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ) : null}
        {batch.rollbackFailure ? <DetailRow label={'Rollback failure'} value={batch.rollbackFailure} /> : null}
        <BatchRollbackControl
          batchId={batch.batchId}
          lifecycleStatus={batch.lifecycleStatus}
          publicationStatus={batch.publicationStatus}
          manualEditAfterStart={batch.manualEditAfterStart}
          rollbackStatus={batch.rollbackStatus}
          onRollbackRequested={onRollbackRequested}
        />
        {executionActions}

        <PipelineTimelineCard batch={batch} />

        <StageCard label={'Ingest'} stage={batch.ingester} />
        <StageCard label={'Document Splitter'} stage={batch.documentSplitter} />
        <StageCard label={'Page Rotator'} stage={batch.pageRotator} />
        <StageCard label={'OCR Processor'} stage={ocrProcessorStage} />
        <StageCard label={'Content Dedup'} stage={batch.contentDedup} />
        <MetadataExtractorStageCard batch={batch} stage={metadataExtractorStage} />
        <StageCard label={'Metadata Validator'} stage={metadataValidatorStage} />
        <StageCard label={'Rights Determinator'} stage={rightsDeterminatorStage} />
        <StageCard label={'Fedora Ingester'} stage={batch.fedoraIngester ?? null} />
      </Stack>
    </Paper>
  )
}
