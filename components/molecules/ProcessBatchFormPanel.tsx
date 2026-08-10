import type { ChangeEvent, ReactElement } from 'react'
import { Alert, Paper, Stack, TextField, Typography } from '@mui/material'

import { Button } from '@atoms/Button'
import { BATCH_NAME_EXISTS_MESSAGE } from '@constants/batches'
import { SearchEntityBox } from '@molecules/SearchEntityBox'

interface ProcessBatchFormPanelProps {
  batchName: string
  collectionName: string
  collectionNotes: string
  isSubmitting: boolean
  isRefreshing: boolean
  canSubmit: boolean
  submitError: string | null
  acceptedBatchName: string | null
  batchNameSearchError: string | null
  batchNameExists: boolean
  onBatchNameChange: (value: string) => void
  onCollectionNameChange: (value: string) => void
  onCollectionNotesChange: (value: string) => void
  onSubmit: () => void
  onRefresh: () => void
}

function handleTextChange(callback: (value: string) => void): (event: ChangeEvent<HTMLInputElement>) => void {
  return (event) => {
    callback(event.target.value)
  }
}

export function ProcessBatchFormPanel({
  batchName,
  collectionName,
  collectionNotes,
  isSubmitting,
  isRefreshing,
  canSubmit,
  submitError,
  acceptedBatchName,
  batchNameSearchError,
  batchNameExists,
  onBatchNameChange,
  onCollectionNameChange,
  onCollectionNotesChange,
  onSubmit,
  onRefresh,
}: ProcessBatchFormPanelProps): ReactElement {
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, p: 3 }}>
      <Stack spacing={3}>
        <div>
          <Typography
            variant={'caption'}
            sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.16em' }}
          >
            {'Batch Details'}
          </Typography>
          <Typography component={'h2'} variant={'h5'} sx={{ mt: 1 }}>
            {'Create a new batch'}
          </Typography>
          <Typography variant={'body2'} sx={{ mt: 1, color: 'text.secondary' }}>
            {'Choose source folders, add an optional collection, and start the document-processing pipeline.'}
          </Typography>
        </div>

        <SearchEntityBox<string>
          inputValue={batchName}
          options={[]}
          error={batchNameExists}
          required
          openOnFocus={false}
          label={'Batch Name'}
          placeholder={'May 2026 Refugee Mental Health Ingest'}
          helperText={batchNameExists ? BATCH_NAME_EXISTS_MESSAGE : (batchNameSearchError ?? undefined)}
          onInputChange={onBatchNameChange}
          getOptionLabel={(option) => option}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label={'Collection Name'}
            value={collectionName}
            onChange={handleTextChange(onCollectionNameChange)}
            placeholder={'Optional collection'}
            fullWidth
          />
          <TextField
            label={'Collection Notes'}
            value={collectionNotes}
            onChange={handleTextChange(onCollectionNotesChange)}
            placeholder={'Optional collection notes'}
            fullWidth
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button type={'button'} onClick={onSubmit} disabled={!canSubmit} loading={isSubmitting}>
            {'Ingest'}
          </Button>
          <Button type={'button'} variant={'secondary'} onClick={onRefresh} loading={isRefreshing}>
            {'Refresh Status'}
          </Button>
        </Stack>

        {submitError ? <Alert severity={'error'}>{submitError}</Alert> : null}
        {acceptedBatchName ? (
          <Alert severity={'success'}>
            {`Batch <strong>${acceptedBatchName}</strong> was accepted. Live process updates will appear below.`}
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  )
}
