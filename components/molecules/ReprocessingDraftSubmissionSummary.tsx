'use client'

import type { ReactElement } from 'react'
import { Chip, Paper, Stack, Typography } from '@mui/material'

import { getReprocessingDownstreamStages, getReprocessingStageLabel } from '@lib/reprocessingDrafts'
import type { CallbackStageKey } from 'types/pipelineContracts'

interface ReprocessingDraftSubmissionSummaryProps {
  documentCount: number
  restartStage: CallbackStageKey
  collectionName: string | null
  collectionNotes?: string | null
  reason: string
}

export function ReprocessingDraftSubmissionSummary({
  documentCount,
  restartStage,
  collectionName,
  collectionNotes,
  reason,
}: ReprocessingDraftSubmissionSummaryProps): ReactElement {
  const downstreamStages = getReprocessingDownstreamStages(restartStage)
  const followingStages = downstreamStages.slice(1)
  const documentLabel = documentCount === 1 ? 'document' : 'documents'

  return (
    <Paper
      component={'section'}
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2 }}
    >
      <Stack spacing={1.5}>
        <Typography variant={'overline'} sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.14em' }}>
          {'Submission summary'}
        </Typography>
        <Typography variant={'body2'} color={'text.secondary'}>
          {`${documentCount} ${documentLabel} will be processed as follows:`}
        </Typography>
        <Typography variant={'body2'}>
          <strong>{'Starts at: '}</strong>{getReprocessingStageLabel(restartStage)}
        </Typography>
        <Typography variant={'body2'}>
          <strong>{'Then runs: '}</strong>
        </Typography>
        <Stack direction={'row'} spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {followingStages.map((stage) => (
            <Chip key={stage} label={getReprocessingStageLabel(stage)} size={'small'} variant={'outlined'} />
          ))}
        </Stack>
        {collectionName ? (
          <Typography variant={'body2'}>
            <strong>{'Collection: '}</strong>{collectionName}
            {collectionNotes ? ` (${collectionNotes})` : ''}
          </Typography>
        ) : null}
        <Typography variant={'body2'}>
          <strong>{'Reason: '}</strong>{reason}
        </Typography>
      </Stack>
    </Paper>
  )
}
