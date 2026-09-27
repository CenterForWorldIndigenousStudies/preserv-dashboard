'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { createCollectionAction } from '@actions/collections'
import { Button } from '@atoms/Button'
import { COLLECTION_LIBRARY_ID_LABEL } from '@constants/collections'
import { TagSearchCombobox } from '@molecules/TagSearchCombobox'
import type { TagSuggestion } from '@lib/hooks/useTagSearch'
import { normalizeTagName } from '@lib/tagUtils'
import type { CollectionWithMeta } from 'types/collections'

interface AddCollectionDialogProps {
  open: boolean
  collections: CollectionWithMeta[]
  onClose: () => void
}

interface SelectedQualifier {
  id?: string
  name: string
}

export function AddCollectionDialog({ open, collections, onClose }: AddCollectionDialogProps): ReactElement {
  const router = useRouter()
  const [selectedTag, setSelectedTag] = useState<TagSuggestion | null>(null)
  const [pendingCreateName, setPendingCreateName] = useState('')
  const [collectionNotes, setCollectionNotes] = useState('')
  const [tagNotes, setTagNotes] = useState('')
  const [qualifiers, setQualifiers] = useState<SelectedQualifier[]>([])
  const [fedoraNodeId, setFedoraNodeId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const existingCollectionTagIds = useMemo(
    () => new Set(collections.map((collection) => collection.tag_id)),
    [collections],
  )

  useEffect(() => {
    if (!open) {
      return
    }

    setSelectedTag(null)
    setPendingCreateName('')
    setCollectionNotes('')
    setTagNotes('')
    setQualifiers([])
    setFedoraNodeId('')
    setError(null)
    setIsSubmitting(false)
  }, [open])

  function resetSelection(): void {
    setSelectedTag(null)
    setPendingCreateName('')
    setTagNotes('')
    setError(null)
  }

  function addQualifier(qualifier: SelectedQualifier): void {
    if (qualifier.id === selectedTag?.id || qualifier.name === pendingCreateName) {
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

  async function handleSubmit(): Promise<void> {
    if (isSubmitting) {
      return
    }

    if (!selectedTag && !pendingCreateName) {
      setError('Choose an existing tag or create a new tag.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createCollectionAction({
        tagId: selectedTag?.id,
        tagName: pendingCreateName,
        tagNotes: tagNotes.trim(),
        qualifierTagIds: qualifiers.flatMap((qualifier) => (qualifier.id ? [qualifier.id] : [])),
        qualifierTagNames: qualifiers.flatMap((qualifier) => (qualifier.id ? [] : [qualifier.name])),
        collectionNotes: collectionNotes.trim(),
        fedoraNodeId: fedoraNodeId.trim(),
      })

      onClose()
      router.refresh()
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to create collection right now.'
      setError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth={'sm'}
      sx={{ '& .MuiDialog-paper': { borderRadius: '1rem' } }}
    >
      <DialogTitle>{'Add Collection'}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2.5, pt: 1.5 }}>
        {error ? <Alert severity={'error'}>{error}</Alert> : null}
        <TagSearchCombobox
          open={open}
          disabled={isSubmitting}
          label={'Canonical qualifier (required)'}
          placeholder={'Search for a tag or create a new one'}
          onSelectExisting={(tag) => {
            setSelectedTag(tag)
            setPendingCreateName('')
            setTagNotes('')
            setError(null)
          }}
          onSelectCreate={(tagName) => {
            setPendingCreateName(tagName.trim().replace(/\s+/g, ' '))
            setSelectedTag(null)
            setError(null)
          }}
          getOptionDisabled={(tag) => existingCollectionTagIds.has(tag.id)}
          getOptionHelperText={(tag) => (existingCollectionTagIds.has(tag.id) ? 'Already a collection' : null)}
        />

        {selectedTag ? (
          <Alert severity={'info'}>{`Creating a collection for existing tag "${selectedTag.name}".`}</Alert>
        ) : null}

        {pendingCreateName ? (
          <Alert severity={'info'}>{`Creating a new tag and collection for "${pendingCreateName}".`}</Alert>
        ) : null}

        <Box sx={{ display: 'grid', gap: 1 }}>
          <Typography variant={'body2'} sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {'Additional qualifiers'}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {qualifiers.map((qualifier) => (
              <Chip
                key={qualifier.id ?? qualifier.name}
                label={qualifier.name}
                onDelete={isSubmitting ? undefined : () => setQualifiers((current) => current.filter((item) => item !== qualifier))}
              />
            ))}
          </Box>
          <TagSearchCombobox
            open={open}
            disabled={isSubmitting}
            label={'Add qualifier'}
            placeholder={'Search for a tag or create a new one'}
            onSelectExisting={(tag) => addQualifier({ id: tag.id, name: tag.name })}
            onSelectCreate={(name) => {
              const normalizedName = normalizeTagName(name)
              if (normalizedName) addQualifier({ name: normalizedName })
            }}
            getOptionDisabled={(tag) =>
              tag.id === selectedTag?.id || qualifiers.some((qualifier) => qualifier.id === tag.id)
            }
          />
        </Box>

        {selectedTag || pendingCreateName ? (
          <Button variant={'ghost'} onClick={resetSelection} disabled={isSubmitting} sx={{ justifySelf: 'start' }}>
            {'Clear selection'}
          </Button>
        ) : null}

        {pendingCreateName ? (
          <TextField
            label={'Tag notes'}
            value={tagNotes}
            onChange={(event) => setTagNotes(event.target.value)}
            placeholder={'Optional notes for the new tag'}
            fullWidth
            multiline
            minRows={3}
          />
        ) : null}

        <TextField
          label={'Collection notes'}
          value={collectionNotes}
          onChange={(event) => setCollectionNotes(event.target.value)}
          placeholder={'Optional notes for this collection'}
          fullWidth
          multiline
          minRows={3}
        />

        <TextField
          label={COLLECTION_LIBRARY_ID_LABEL}
          value={fedoraNodeId}
          onChange={(event) => setFedoraNodeId(event.target.value)}
          placeholder={`Optional ${COLLECTION_LIBRARY_ID_LABEL}`}
          disabled={isSubmitting}
          fullWidth
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button variant={'ghost'} onClick={onClose} disabled={isSubmitting}>
          {'Cancel'}
        </Button>
        <Button variant={'primary'} onClick={() => void handleSubmit()} loading={isSubmitting}>
          {'Add Collection'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
