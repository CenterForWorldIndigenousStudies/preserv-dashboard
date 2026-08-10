import type { ReactElement } from 'react'
import { Box, Typography } from '@mui/material'

import type { ProcessStageStatus } from 'types/pipelineContracts'

interface ProcessStageMetricsGridProps {
  stageLabel: string
  stage: ProcessStageStatus
}

function getMetrics(stageLabel: string, stage: ProcessStageStatus): Array<{ label: string; value: number }> {
  switch (stageLabel) {
    case 'Ingest':
      return [
        { label: 'Processed', value: stage.processedCount },
        { label: 'Ingested', value: stage.ingestedCount },
        { label: 'Duplicates', value: stage.duplicateCount },
        { label: 'Same Origin Skips', value: stage.skippedSameOriginCount },
      ]
    case 'Page Rotator':
      return [
        { label: 'Processed', value: stage.processedCount },
        { label: 'Rotated', value: stage.rotatedCount },
        { label: 'Pass Through', value: stage.passedThroughCount },
        { label: 'Review', value: stage.reviewNeededCount },
        { label: 'Failed', value: stage.failedCount },
      ]
    case 'OCR Processor':
      return [
        { label: 'Processed', value: stage.processedCount },
        { label: 'OCR Complete', value: stage.ocrCompletedCount },
        { label: 'Pass Through', value: stage.passedThroughCount },
        { label: 'Review', value: stage.reviewNeededCount },
        { label: 'Failed', value: stage.failedCount },
      ]
    case 'Content Dedup':
      return [
        { label: 'Processed', value: stage.processedCount },
        { label: 'Exact Dups', value: stage.exactDuplicateCount },
        { label: 'Versioned', value: stage.versionedCount },
        { label: 'Resolved', value: stage.resolvedCount },
        { label: 'Skipped', value: stage.skippedCount },
        { label: 'Failed', value: stage.failedCount },
      ]
    case 'Metadata Extractor':
      return [
        { label: 'Processed', value: stage.processedCount },
        { label: 'Extracted', value: stage.extractedCount },
        { label: 'Review', value: stage.reviewNeededCount },
        { label: 'Failed', value: stage.failedCount },
      ]
    case 'Metadata Validator':
      return [
        { label: 'Processed', value: stage.processedCount },
        { label: 'Validated', value: stage.metadataValidatedCount },
        { label: 'Under Review', value: stage.underReviewCount },
        { label: 'Failed', value: stage.failedCount },
      ]
    case 'Rights Determinator':
      return [
        { label: 'Processed', value: stage.processedCount },
        { label: 'Rights Determined', value: stage.rightsDeterminedCount },
        { label: 'Under Review', value: stage.underReviewCount },
        { label: 'Failed', value: stage.failedCount },
      ]
    default:
      return [
        { label: 'Processed', value: stage.processedCount },
        { label: 'Split Docs', value: stage.splitCount },
        { label: 'Child Docs', value: stage.childCount },
        { label: 'Pass Through', value: stage.passedThroughCount },
        { label: 'Review', value: stage.reviewNeededCount },
      ]
  }
}

export function ProcessStageMetricsGrid({ stageLabel, stage }: ProcessStageMetricsGridProps): ReactElement {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr 1fr',
          lg: 'repeat(4, minmax(0, 1fr))',
        },
      }}
    >
      {getMetrics(stageLabel, stage).map(({ label, value }) => (
        <Box key={label}>
          <Typography
            variant={'caption'}
            sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.12em' }}
          >
            {label}
          </Typography>
          <Typography component={'p'} variant={'h6'} sx={{ mt: 0.5 }}>
            {value}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
