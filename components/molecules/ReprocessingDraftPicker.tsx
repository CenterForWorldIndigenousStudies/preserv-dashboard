'use client'

import { useMemo, type ReactElement } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { SearchEntityBox } from '@molecules/SearchEntityBox'
import { getReprocessingStageLabel } from '@lib/reprocessingDrafts'
import type { ReprocessingDraftSummary } from 'types/reprocessingDrafts'

interface ReprocessingDraftPickerProps {
  drafts: readonly ReprocessingDraftSummary[]
  value: string | null
  onChange: (draft: ReprocessingDraftSummary | null) => void
  restartStage?: ReprocessingDraftSummary['restartStage']
  disabled?: boolean
  label?: string
}

export function ReprocessingDraftPicker({
  drafts,
  value,
  onChange,
  restartStage,
  disabled = false,
  label = 'Existing reprocessing batch',
}: ReprocessingDraftPickerProps): ReactElement {
  const options = useMemo(
    () => drafts.filter((draft) => !restartStage || draft.restartStage === restartStage),
    [drafts, restartStage],
  )
  const selected = options.find((draft) => draft.id === value) ?? null

  return (
    <SearchEntityBox<ReprocessingDraftSummary>
      inputValue={selected?.name ?? ''}
      options={options}
      openOnFocus
      disabled={disabled}
      label={label}
      placeholder={'Search open draft batches'}
      onInputChange={() => undefined}
      onSelectOption={(draft) => {
        onChange(draft)
      }}
      getOptionLabel={(draft) => draft.name}
      renderOption={(draft) => (
        <Box component={'span'} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant={'body2'} sx={{ fontWeight: 600 }}>
            {draft.name}
          </Typography>
          <Typography variant={'caption'} color={'text.secondary'}>
            {`${draft.documentCount} document${draft.documentCount === 1 ? '' : 's'} · ${getReprocessingStageLabel(draft.restartStage)}`}
          </Typography>
        </Box>
      )}
      helperText={
        restartStage
          ? 'Only drafts with the same restart stage can accept this document.'
          : 'Only open draft batches are available.'
      }
    />
  )
}
