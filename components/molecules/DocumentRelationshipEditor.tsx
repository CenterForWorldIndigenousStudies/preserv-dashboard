'use client'

import { useMemo, type ReactElement } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { Button } from '@atoms/Button'
import { IconX } from '@atoms/icons/IconX'
import { RelationshipSearchCombobox } from '@molecules/RelationshipSearchCombobox'
import type { RelationshipOption } from '@lib/queries/documentRelationshipQueries'
import type { DocumentEditContributor, DocumentEditPublisher } from 'types/documentEditing'

interface DocumentRelationshipEditorProps {
  contributors: DocumentEditContributor[]
  publishers: DocumentEditPublisher[]
  onContributorsChange: (contributors: DocumentEditContributor[]) => void
  onPublishersChange: (publishers: DocumentEditPublisher[]) => void
}

function updateAt<T>(items: T[], index: number, value: T): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item))
}

export function DocumentRelationshipEditor({
  contributors,
  publishers,
  onContributorsChange,
  onPublishersChange,
}: DocumentRelationshipEditorProps): ReactElement {
  const contributorIds = useMemo(
    () => new Set(contributors.map((contributor) => contributor.contributorId)),
    [contributors],
  )
  const publisherIds = useMemo(() => new Set(publishers.map((publisher) => publisher.publisherId)), [publishers])

  function addContributor(option: RelationshipOption): void {
    onContributorsChange([
      ...contributors,
      { contributorId: option.id, name: option.name, role: 'author', type: null, notes: null },
    ])
  }

  function addPublisher(option: RelationshipOption): void {
    onPublishersChange([...publishers, { publisherId: option.id, name: option.name, notes: null }])
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component={'h4'} variant={'subtitle1'} color={'text.primary'}>
          {'Contributors'}
        </Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {contributors.map((contributor, index) => (
            <Paper key={`${contributor.contributorId}-${contributor.role}-${index}`} elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
              <Stack spacing={1.5}>
                <Typography variant={'body1'} color={'text.primary'}>
                  {contributor.name ?? contributor.contributorId}
                </Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <TextField
                    fullWidth
                    label={'Role'}
                    value={contributor.role}
                    onChange={(event) => onContributorsChange(updateAt(contributors, index, { ...contributor, role: event.target.value }))}
                  />
                  <TextField
                    fullWidth
                    label={'Type'}
                    value={contributor.type ?? ''}
                    onChange={(event) => onContributorsChange(updateAt(contributors, index, { ...contributor, type: event.target.value }))}
                  />
                </Stack>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label={'Notes'}
                  value={contributor.notes ?? ''}
                  onChange={(event) => onContributorsChange(updateAt(contributors, index, { ...contributor, notes: event.target.value }))}
                />
                <Button
                  variant={'ghost'}
                  startIcon={<IconX size={16} />}
                  onClick={() => onContributorsChange(contributors.filter((_, itemIndex) => itemIndex !== index))}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {'Remove contributor'}
                </Button>
              </Stack>
            </Paper>
          ))}
          <RelationshipSearchCombobox
            kind={'contributor'}
            excludedIds={contributorIds}
            onSelect={addContributor}
          />
        </Stack>
      </Box>

      <Box>
        <Typography component={'h4'} variant={'subtitle1'} color={'text.primary'}>
          {'Publishers'}
        </Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {publishers.map((publisher, index) => (
            <Paper key={`${publisher.publisherId}-${index}`} elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
              <Stack spacing={1.5}>
                <Typography variant={'body1'} color={'text.primary'}>
                  {publisher.name ?? publisher.publisherId}
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label={'Notes'}
                  value={publisher.notes ?? ''}
                  onChange={(event) => onPublishersChange(updateAt(publishers, index, { ...publisher, notes: event.target.value }))}
                />
                <Button
                  variant={'ghost'}
                  startIcon={<IconX size={16} />}
                  onClick={() => onPublishersChange(publishers.filter((_, itemIndex) => itemIndex !== index))}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {'Remove publisher'}
                </Button>
              </Stack>
            </Paper>
          ))}
          <RelationshipSearchCombobox kind={'publisher'} excludedIds={publisherIds} onSelect={addPublisher} />
        </Stack>
      </Box>
    </Stack>
  )
}
