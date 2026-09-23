import type { ReactElement, ReactNode } from 'react'
import { Alert, Paper, Stack } from '@mui/material'

import {
  CONTENT_DEDUP_SERVICE,
  DATA_INGESTER_SERVICE,
  DOCUMENT_SPLITTER_SERVICE,
  FEDORA_INGESTER_SERVICE,
  METADATA_EXTRACTOR_SERVICE,
  OCR_PROCESSOR_SERVICE,
  PAGE_ROTATOR_SERVICE,
  getPipelineServiceDefinition,
} from '@constants/pipeline'
import { BATCH_ROLLBACK_STATUSES } from '@constants/batchRollbackStatuses'
import { LEGACY_IMPORT_MODE } from '@constants/legacyImport'
import { BatchRollbackControl } from '@molecules/BatchRollbackControl'
import { BatchOverviewFields } from '@molecules/BatchOverviewFields'
import { MetadataExtractorStageCard } from '@molecules/MetadataExtractorStageCard'
import { ProcessDetailRow } from '@molecules/ProcessDetailRow'
import { ProcessStageCard } from '@molecules/ProcessStageCard'
import { PipelineTimelineCard } from '@molecules/PipelineTimelineCard'
import { ProcessBatchSummaryHeader } from '@molecules/ProcessBatchSummaryHeader'
import { formatExecutionLabel } from '@lib/pipelineFormatting'
import { buildLegacyPipelineSteps } from '@lib/legacyPipelineProgress'
import { createPendingProcessStage, shouldShowPendingProcessStage } from '@lib/processStageStatus'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

interface ProcessBatchStatusCardProps {
  batch: ProcessBatchStatus
  onRollbackRequested?: () => void
  executionActions?: ReactNode
}

export function ProcessBatchStatusCard({
  batch,
  onRollbackRequested,
  executionActions,
}: ProcessBatchStatusCardProps): ReactElement {
  const ocrProcessorStage =
    batch.ocrProcessor ??
    (shouldShowPendingProcessStage(batch, batch.ocrProcessor, OCR_PROCESSOR_SERVICE) ? createPendingProcessStage() : null)
  const metadataExtractorStage =
    batch.metadataExtractor ??
    (shouldShowPendingProcessStage(batch, batch.metadataExtractor, METADATA_EXTRACTOR_SERVICE)
      ? createPendingProcessStage()
      : null)
  const executionLabel = formatExecutionLabel(batch)
  const isLegacyBatch = batch.pipelineExecutionMode === LEGACY_IMPORT_MODE
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, p: 3 }}>
      <Stack spacing={2.5}>
        <ProcessBatchSummaryHeader
          batchName={batch.batchName ?? ''}
          batchId={batch.batchId}
          startedBy={batch.startedBy}
        />

        <BatchOverviewFields
          createdAt={batch.createdAt}
          startedAt={batch.startedAt}
          requestedStages={batch.pipelineRequestedStages}
          lifecycleStatus={batch.lifecycleStatus}
          publicationState={batch.publicationState}
        />
        {executionLabel ? <ProcessDetailRow label={'Execution'} value={executionLabel} /> : null}
        {batch.rollbackStatus ? (
          <ProcessDetailRow
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
        {batch.rollbackFailure ? <ProcessDetailRow label={'Rollback failure'} value={batch.rollbackFailure} /> : null}
        {batch.rollbackStatus === BATCH_ROLLBACK_STATUSES.ROLLED_BACK ? (
          <Alert severity={'success'}>
            {
              'This batch was rolled back successfully. Its generated database artifacts were removed, and its Google Drive artifacts were moved to the administrator delete folder.'
            }
          </Alert>
        ) : null}
        <BatchRollbackControl
          batchId={batch.batchId}
          lifecycleStatus={batch.lifecycleStatus}
          manualEditAfterStart={batch.manualEditAfterStart}
          rollbackStatus={batch.rollbackStatus}
          onRollbackRequested={onRollbackRequested}
        />
        {executionActions}

        <PipelineTimelineCard
          batch={batch}
          steps={isLegacyBatch ? buildLegacyPipelineSteps(batch) : undefined}
          title={isLegacyBatch ? 'Legacy Pipeline Progress' : undefined}
        />

        {!isLegacyBatch ? (
          <>
            <ProcessStageCard label={getPipelineServiceDefinition(DATA_INGESTER_SERVICE).label} stage={batch.ingester} />
            <ProcessStageCard
              label={getPipelineServiceDefinition(DOCUMENT_SPLITTER_SERVICE).label}
              stage={batch.documentSplitter}
            />
            <ProcessStageCard label={getPipelineServiceDefinition(PAGE_ROTATOR_SERVICE).label} stage={batch.pageRotator} />
            <ProcessStageCard label={getPipelineServiceDefinition(OCR_PROCESSOR_SERVICE).label} stage={ocrProcessorStage} />
            <ProcessStageCard label={getPipelineServiceDefinition(CONTENT_DEDUP_SERVICE).label} stage={batch.contentDedup} />
            <MetadataExtractorStageCard batch={batch} stage={metadataExtractorStage} />
            <ProcessStageCard
              label={getPipelineServiceDefinition(FEDORA_INGESTER_SERVICE).label}
              stage={batch.fedoraIngester ?? null}
            />
          </>
        ) : null}
      </Stack>
    </Paper>
  )
}
