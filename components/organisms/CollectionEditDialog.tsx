'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { updateCollectionAction } from '@actions/collections'
import { Button } from '@atoms/Button'
import { COLLECTION_LIBRARY_ID_LABEL } from '@constants/collections'
import type { TagSuggestion } from '@lib/hooks/useTagSearch'
import { normalizeTagName } from '@lib/tagUtils'
import { TagSearchCombobox } from '@molecules/TagSearchCombobox'
import { Modal } from '@organisms/Modal'
import type { CollectionWithMeta } from 'types/collections'

interface SelectedQualifier {
  id?: string
  name: string
}

interface CollectionEditDialogProps {
  collection: CollectionWithMeta | null
  open: boolean
  onClose: () => void
}

export function CollectionEditDialog({ collection, open, onClose }: CollectionEditDialogProps): ReactElement | null {
  const router = useRouter()
  const [qualifiers, setQualifiers] = useState<SelectedQualifier[]>([])
  const [collectionNotes, setCollectionNotes] = useState('')
  const [fedoraNodeId, setFedoraNodeId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canonicalTag = useMemo(
    () => collection?.canonical_tag ?? (collection ? { id: collection.tag_id, name: collection.collection_name } : null),
    [collection],
  )

  useEffect(() => {
    if (!open || !collection) {
      return
    }

    setQualifiers(collection.qualifiers ?? [])
    setCollectionNotes(collection.notes ?? '')
    setFedoraNodeId(collection.fedora_node_id ?? '')
    setError(null)
    setIsSubmitting(false)
  }, [collection, open])

  if (!collection || !canonicalTag) {
    return null
  }
  const activeCollection = collection
  const activeCanonicalTag = canonicalTag

  function addQualifier(qualifier: SelectedQualifier): void {
    if (qualifier.id === activeCanonicalTag.id || qualifier.name === activeCanonicalTag.name) {
      setError('The canonical tag is already a required collection qualifier.')
      return
    }
    if (qualifiers.some((item) => item.id === qualifier.id || item.name === qualifier.name)) {
      setError(`Qualifier "${qualifier.name}" is already selected.`)
      return
    }

    setQualifiers((current) => [...current, qualifier])
    setError(null)
  }

  function removeQualifier(qualifier: SelectedQualifier): void {
    setQualifiers((current) => current.filter((item) => item !== qualifier))
  }

  async function submit(): Promise<void> {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await updateCollectionAction({
        collectionId: activeCollection.id,
        qualifierTagIds: qualifiers.flatMap((qualifier) => (qualifier.id ? [qualifier.id] : [])),
        qualifierTagNames: qualifiers.flatMap((qualifier) => (qualifier.id ? [] : [qualifier.name])),
        collectionNotes,
        fedoraNodeId,
      })
      onClose()
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to update the collection right now.')
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      disableClose={isSubmitting}
      maxWidth={'sm'}
      title={'Edit Collection'}
      contentSx={{ display: 'grid', gap: 2.5, pt: 1.5 }}
      actions={
        <>
          <Button variant={'ghost'} onClick={onClose} disabled={isSubmitting}>
            {'Cancel'}
          </Button>
          <Button variant={'primary'} onClick={() => void submit()} loading={isSubmitting}>
            {'Save collection'}
          </Button>
        </>
      }
    >
        {error ? <Alert severity={'error'}>{error}</Alert> : null}
        <Stack spacing={1}>
          <Typography variant={'body2'} sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {'Canonical qualifier (required)'}
          </Typography>
          <Box>
            <Chip label={canonicalTag.name} disabled />
          </Box>
        </Stack>
        <Stack spacing={1}>
          <Typography variant={'body2'} sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {'Additional qualifiers'}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {qualifiers.map((qualifier) => (
              <Chip
                key={qualifier.id ?? qualifier.name}
                label={qualifier.name}
                onDelete={isSubmitting ? undefined : () => removeQualifier(qualifier)}
              />
            ))}
          </Box>
          <TagSearchCombobox
            open={open}
            disabled={isSubmitting}
            label={'Add qualifier'}
            placeholder={'Search for a tag or create a new one'}
            onSelectExisting={(tag: TagSuggestion) => addQualifier({ id: tag.id, name: tag.name })}
            onSelectCreate={(tagName) => {
              const name = normalizeTagName(tagName)
              if (name) addQualifier({ name })
            }}
            getOptionDisabled={(tag) =>
              tag.id === canonicalTag.id || qualifiers.some((qualifier) => qualifier.id === tag.id)
            }
          />
        </Stack>
        <TextField
          label={COLLECTION_LIBRARY_ID_LABEL}
          value={fedoraNodeId}
          onChange={(event) => setFedoraNodeId(event.target.value)}
          placeholder={`Optional ${COLLECTION_LIBRARY_ID_LABEL}`}
          disabled={isSubmitting}
          fullWidth
        />
        <TextField
          label={'Collection notes'}
          value={collectionNotes}
          onChange={(event) => setCollectionNotes(event.target.value)}
          placeholder={'Optional notes for this collection'}
          disabled={isSubmitting}
          fullWidth
          multiline
          minRows={3}
        />
    </Modal>
  )
}
