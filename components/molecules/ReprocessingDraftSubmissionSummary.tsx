'use client'

import type { ReactElement } from 'react'
import { Chip, Paper, Stack, Typography } from '@mui/material'

import { getReprocessingStageLabel } from '@lib/reprocessingDrafts'
import type { CallbackStageKey } from 'types/pipelineContracts'

interface ReprocessingDraftSubmissionSummaryProps {
  documentCount: number
  sourceFolderCount?: number
  restartStage: CallbackStageKey
  requestedStages: readonly CallbackStageKey[]
  collectionName: string | null
  collectionNotes?: string | null
  reason: string
}

export function ReprocessingDraftSubmissionSummary({
  documentCount,
  sourceFolderCount = 0,
  restartStage,
  requestedStages,
  collectionName,
  collectionNotes,
  reason,
}: ReprocessingDraftSubmissionSummaryProps): ReactElement {
  const documentLabel = documentCount === 1 ? 'document' : 'documents'
  const folderLabel = sourceFolderCount === 1 ? 'folder' : 'folders'

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
          {sourceFolderCount > 0
            ? `${documentCount} ${documentLabel} and ${sourceFolderCount} ${folderLabel} will be processed as follows:`
            : `${documentCount} ${documentLabel} will be processed as follows:`}
        </Typography>
        <Typography variant={'body2'}>
          <strong>{'Starts at: '}</strong>
          {getReprocessingStageLabel(restartStage)}
        </Typography>
        <Typography variant={'body2'}>
          <strong>{'Stages: '}</strong>
        </Typography>
        <Stack direction={'row'} spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {requestedStages.map((stage) => (
            <Chip key={stage} label={getReprocessingStageLabel(stage)} size={'small'} variant={'outlined'} />
          ))}
        </Stack>
        {collectionName ? (
          <Typography variant={'body2'}>
            <strong>{'Collection: '}</strong>
            {collectionName}
            {collectionNotes ? ` (${collectionNotes})` : ''}
          </Typography>
        ) : null}
        <Typography variant={'body2'}>
          <strong>{'Reason: '}</strong>
          {reason}
        </Typography>
      </Stack>
    </Paper>
  )
}
