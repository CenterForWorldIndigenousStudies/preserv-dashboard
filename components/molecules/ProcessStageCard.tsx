'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { Box, Stack, Typography } from '@mui/material'

import { PipelineStageStatusBadge } from '@atoms/Badges/PipelineStageStatusBadge'
import { AccordionPanel } from '@molecules/AccordionPanel'
import { MetadataExtractorOpenAIBatchActions } from '@molecules/MetadataExtractorOpenAIBatchActions'
import { ProcessStageDetailList } from '@molecules/ProcessStageDetailList'
import { ProcessStageDiagnosticsPanel } from '@molecules/ProcessStageDiagnosticsPanel'
import { ProcessStageMetricsGrid } from '@molecules/ProcessStageMetricsGrid'
import { formatReviewWarning } from '@lib/pipelineFormatting'
import type { ProcessStageStatus } from 'types/pipelineContracts'

interface ProcessStageCardProps {
  label: string
  stage: ProcessStageStatus | null
  batchId?: string
  showOpenAIBatchActions?: boolean
}

function shouldStartExpanded(status: string | null | undefined): boolean {
  return (
    status === 'accepted' ||
    status === 'queued' ||
    status === 'running' ||
    status === 'failed' ||
    status === 'review_needed'
  )
}

export function ProcessStageCard({
  label,
  stage,
  batchId,
  showOpenAIBatchActions = false,
}: ProcessStageCardProps): ReactElement | null {
  const [expanded, setExpanded] = useState(() => shouldStartExpanded(stage?.status))

  useEffect(() => {
    if (stage?.status === 'completed') {
      setExpanded(false)
    }
  }, [stage?.status])

  if (!stage) {
    return null
  }

  const reviewWarning = formatReviewWarning(stage.reviewNeededCount)

  return (
    <AccordionPanel
      expanded={expanded}
      onChange={(_event, isExpanded) => {
        setExpanded(isExpanded)
      }}
      summary={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 2 }}>
          <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{label}</Typography>
          <PipelineStageStatusBadge status={stage.status} />
        </Box>
      }
      summarySx={{
        '& .MuiAccordionSummary-content': {
          justifyContent: 'space-between',
        },
      }}
    >
      <Stack spacing={2}>
        <Stack direction={'row'} spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {reviewWarning ? (
            <Typography variant={'caption'} sx={{ color: 'warning.main', fontWeight: 600 }}>
              {reviewWarning}
            </Typography>
          ) : null}
        </Stack>

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
    </AccordionPanel>
  )
}
