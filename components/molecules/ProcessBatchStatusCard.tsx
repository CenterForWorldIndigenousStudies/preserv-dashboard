import type { ReactElement } from 'react'
import { Box, Paper, Stack, Typography } from '@mui/material'

import { PipelineStageStatusBadge } from '@atoms/Badges/PipelineStageStatusBadge'
import { PipelineTimelineCard } from '@components/ProcessDocuments/PipelineTimelineCard'
import { ProcessBatchSummaryHeader } from '@molecules/ProcessBatchSummaryHeader'
import { ProcessStageDetailList } from '@molecules/ProcessStageDetailList'
import { ProcessStageDiagnosticsPanel } from '@molecules/ProcessStageDiagnosticsPanel'
import { ProcessStageMetricsGrid } from '@molecules/ProcessStageMetricsGrid'
import type { ProcessBatchStatus, ProcessStageStatus } from 'types/pipelineContracts'

interface ProcessBatchStatusCardProps {
  batch: ProcessBatchStatus
}

function buildPendingStage(): ProcessStageStatus {
  return {
    status: 'pending',
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
    underReviewCount: 0,
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
  }
}

function shouldShowPendingMetadataExtractor(batch: ProcessBatchStatus): boolean {
  if (batch.metadataExtractor) {
    return false
  }

  if (batch.pipelineRequestedStages.includes('metadata-extraction')) {
    return true
  }

  return batch.pipelineConfig?.executionPlan.some((step) => step.enabled && step.service === 'metadata-extraction') ?? false
}

function shouldShowPendingMetadataValidator(batch: ProcessBatchStatus): boolean {
  if (batch.metadataValidator) {
    return false
  }

  if (batch.pipelineRequestedStages.includes('metadata-validation')) {
    return true
  }

  return batch.pipelineConfig?.executionPlan.some((step) => step.enabled && step.service === 'metadata-validation') ?? false
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

function DetailRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
        {label}:
      </Box>{' '}
      {value}
    </Typography>
  )
}

function StageCard({ label, stage }: { label: string; stage: ProcessStageStatus | null }): ReactElement | null {
  if (!stage) {
    return null
  }

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
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              {label}
            </Typography>
            <Typography variant="h6">{label}</Typography>
          </Box>
          <PipelineStageStatusBadge status={stage.status} />
        </Box>

        <ProcessStageMetricsGrid stageLabel={label} stage={stage} />
        <ProcessStageDetailList stage={stage} />
        <ProcessStageDiagnosticsPanel stage={stage} />
      </Stack>
    </Paper>
  )
}

export function ProcessBatchStatusCard({ batch }: ProcessBatchStatusCardProps): ReactElement {
  const metadataExtractorStage = batch.metadataExtractor ?? (shouldShowPendingMetadataExtractor(batch) ? buildPendingStage() : null)
  const metadataValidatorStage = batch.metadataValidator ?? (shouldShowPendingMetadataValidator(batch) ? buildPendingStage() : null)

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, p: 3 }}>
      <Stack spacing={2.5}>
        <ProcessBatchSummaryHeader
          batchName={batch.batchName ?? ''}
          batchId={batch.batchId}
          startedBy={batch.startedBy}
        />

        <DetailRow label="Created" value={formatDateTime(batch.createdAt)} />
        <DetailRow
          label="Requested Stages"
          value={batch.pipelineRequestedStages.length > 0 ? batch.pipelineRequestedStages.join(', ') : 'Ingest only'}
        />

        <PipelineTimelineCard batch={batch} />

        <StageCard label="Ingest" stage={batch.ingester} />
        <StageCard label="Document Splitter" stage={batch.documentSplitter} />
        <StageCard label="Page Rotator" stage={batch.pageRotator} />
        <StageCard label="OCR Processor" stage={batch.ocrProcessor} />
        <StageCard label="Content Dedup" stage={batch.contentDedup} />
        <StageCard label="Metadata Extractor" stage={metadataExtractorStage} />
        <StageCard label="Metadata Validator" stage={metadataValidatorStage} />
      </Stack>
    </Paper>
  )
}
