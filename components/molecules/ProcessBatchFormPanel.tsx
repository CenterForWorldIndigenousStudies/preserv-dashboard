import { useState, type ReactElement } from 'react'
import { Alert, Paper, Stack, Typography } from '@mui/material'

import { Button } from '@atoms/Button'
import { BATCH_NAME_EXISTS_MESSAGE } from '@constants/batches'
import { SearchEntityBox } from '@molecules/SearchEntityBox'
import { CollectionNameCombobox } from '@molecules/CollectionNameCombobox'
import type { CollectionProposal } from 'types/collections'

interface ProcessBatchFormPanelProps {
  batchName: string
  collectionName: string
  collectionProposal?: CollectionProposal | null
  isSubmitting: boolean
  isRefreshing: boolean
  canSubmit: boolean
  submitError: string | null
  acceptedBatchName: string | null
  batchNameSearchError: string | null
  batchNameExists: boolean
  onBatchNameChange: (value: string) => void
  onCollectionNameChange: (value: string) => void
  onCollectionProposalChange?: (proposal: CollectionProposal | null) => void
  onSubmit: () => void
  onRefresh: () => void
  title?: string
  description?: string
  submitLabel?: string
  showRefresh?: boolean
}

const DEFAULT_DESCRIPTION =
  'Choose source folders, add an optional collection, and start the document-processing pipeline.'
const DEFAULT_TITLE = 'Create a new batch'
export const DEFAULT_SUBMIT_LABEL = 'Process'

export function ProcessBatchFormPanel({
  batchName,
  collectionName,
  collectionProposal,
  isSubmitting,
  isRefreshing,
  canSubmit,
  submitError,
  acceptedBatchName,
  batchNameSearchError,
  batchNameExists,
  onBatchNameChange,
  onCollectionNameChange,
  onCollectionProposalChange,
  onSubmit,
  onRefresh,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  submitLabel = DEFAULT_SUBMIT_LABEL,
  showRefresh = true,
}: ProcessBatchFormPanelProps): ReactElement {
  const [collectionSelectionValid, setCollectionSelectionValid] = useState(true)
  const [localProposal, setLocalProposal] = useState<CollectionProposal | null>(null)

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
            {title}
          </Typography>
          <Typography variant={'body2'} sx={{ mt: 1, color: 'text.secondary' }}>
            {description}
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

        <CollectionNameCombobox
          value={collectionName}
          proposal={collectionProposal === undefined ? localProposal : collectionProposal}
          onChange={onCollectionNameChange}
          onProposalChange={onCollectionProposalChange ?? setLocalProposal}
          onValidityChange={setCollectionSelectionValid}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            type={'button'}
            onClick={() => {
              if (collectionSelectionValid) onSubmit()
            }}
            disabled={!canSubmit || !collectionSelectionValid}
            loading={isSubmitting}
          >
            {submitLabel}
          </Button>
          {showRefresh ? (
            <Button type={'button'} variant={'secondary'} onClick={onRefresh} loading={isRefreshing}>
              {'Refresh Status'}
            </Button>
          ) : null}
        </Stack>

        {submitError ? <Alert severity={'error'}>{submitError}</Alert> : null}
        {acceptedBatchName ? (
          <Alert severity={'success'}>
            {`Batch `}
            <strong>{acceptedBatchName}</strong>
            {` was accepted. Live process updates will appear below.`}
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  )
}
