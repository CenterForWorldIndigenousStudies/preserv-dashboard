import type { ReactElement, ReactNode } from 'react'
import { Alert, Paper, Stack } from '@mui/material'

import {
  METADATA_EXTRACTOR_STAGE,
  METADATA_VALIDATOR_STAGE,
  OCR_PROCESSOR_STAGE,
  RIGHTS_DETERMINATOR_STAGE,
} from '@constants/pipeline'
import { BatchRollbackControl } from '@molecules/BatchRollbackControl'
import { MetadataExtractorStageCard } from '@molecules/MetadataExtractorStageCard'
import { ProcessDetailRow } from '@molecules/ProcessDetailRow'
import { ProcessStageCard } from '@molecules/ProcessStageCard'
import { PipelineTimelineCard } from '@molecules/PipelineTimelineCard'
import { ProcessBatchSummaryHeader } from '@molecules/ProcessBatchSummaryHeader'
import { formatDateTime } from '@lib/dateTime'
import { formatExecutionLabel } from '@lib/pipelineFormatting'
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
  const ocrProcessorStage = batch.ocrProcessor ??
    (shouldShowPendingProcessStage(batch, batch.ocrProcessor, OCR_PROCESSOR_STAGE)
      ? createPendingProcessStage()
      : null)
  const metadataExtractorStage =
    batch.metadataExtractor ??
    (shouldShowPendingProcessStage(batch, batch.metadataExtractor, METADATA_EXTRACTOR_STAGE)
      ? createPendingProcessStage()
      : null)
  const metadataValidatorStage =
    batch.metadataValidator ??
    (shouldShowPendingProcessStage(batch, batch.metadataValidator, METADATA_VALIDATOR_STAGE)
      ? createPendingProcessStage()
      : null)
  const rightsDeterminatorStage =
    batch.rightsDeterminator ??
    (shouldShowPendingProcessStage(batch, batch.rightsDeterminator, RIGHTS_DETERMINATOR_STAGE)
      ? createPendingProcessStage()
      : null)
  const executionLabel = formatExecutionLabel(batch)
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, p: 3 }}>
      <Stack spacing={2.5}>
        <ProcessBatchSummaryHeader
          batchName={batch.batchName ?? ''}
          batchId={batch.batchId}
          startedBy={batch.startedBy}
        />

        <ProcessDetailRow label={'Created'} value={formatDateTime(batch.createdAt) ?? '—'} />
        <ProcessDetailRow
          label={'Requested Stages'}
          value={batch.pipelineRequestedStages.length > 0 ? batch.pipelineRequestedStages.join(', ') : 'Ingest only'}
        />
        {executionLabel ? <ProcessDetailRow label={'Execution'} value={executionLabel} /> : null}
        <ProcessDetailRow label={'Lifecycle'} value={batch.lifecycleStatus ?? 'unknown'} />
        <ProcessDetailRow label={'Publication'} value={batch.publicationStatus ?? 'unknown'} />
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
        {batch.rollbackStatus === 'reverted' ? (
          <Alert severity={'success'}>
            {'This batch was rolled back successfully. Its generated database artifacts were removed, and its Google Drive artifacts were moved to the administrator delete folder.'}
          </Alert>
        ) : null}
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

        <ProcessStageCard label={'Ingest'} stage={batch.ingester} />
        <ProcessStageCard label={'Document Splitter'} stage={batch.documentSplitter} />
        <ProcessStageCard label={'Page Rotator'} stage={batch.pageRotator} />
        <ProcessStageCard label={'OCR Processor'} stage={ocrProcessorStage} />
        <ProcessStageCard label={'Content Dedup'} stage={batch.contentDedup} />
        <MetadataExtractorStageCard batch={batch} stage={metadataExtractorStage} />
        <ProcessStageCard label={'Metadata Validator'} stage={metadataValidatorStage} />
        <ProcessStageCard label={'Rights Determinator'} stage={rightsDeterminatorStage} />
        <ProcessStageCard label={'Fedora Ingester'} stage={batch.fedoraIngester ?? null} />
      </Stack>
    </Paper>
  )
}
