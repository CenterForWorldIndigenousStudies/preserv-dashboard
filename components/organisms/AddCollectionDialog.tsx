'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import { createCollectionAction, createCollectionWithNewTagAction } from '@actions/collections'
import { Button } from '@atoms/Button'
import { TagSearchCombobox } from '@molecules/TagSearchCombobox'
import type { TagSuggestion } from '@lib/hooks/useTagSearch'
import type { CollectionWithMeta } from 'types/collections'

interface AddCollectionDialogProps {
  open: boolean
  collections: CollectionWithMeta[]
  onClose: () => void
}

export function AddCollectionDialog({ open, collections, onClose }: AddCollectionDialogProps): ReactElement {
  const router = useRouter()
  const [selectedTag, setSelectedTag] = useState<TagSuggestion | null>(null)
  const [pendingCreateName, setPendingCreateName] = useState('')
  const [collectionNotes, setCollectionNotes] = useState('')
  const [tagNotes, setTagNotes] = useState('')
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
    setError(null)
    setIsSubmitting(false)
  }, [open])

  function resetSelection(): void {
    setSelectedTag(null)
    setPendingCreateName('')
    setTagNotes('')
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
      if (selectedTag) {
        await createCollectionAction({
          tagId: selectedTag.id,
          collectionNotes: collectionNotes.trim(),
        })
      } else {
        await createCollectionWithNewTagAction({
          tagName: pendingCreateName,
          tagNotes: tagNotes.trim(),
          collectionNotes: collectionNotes.trim(),
        })
      }

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
      maxWidth="sm"
      sx={{ '& .MuiDialog-paper': { borderRadius: '1rem' } }}
    >
      <DialogTitle>Add Collection</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2.5, pt: 1.5 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TagSearchCombobox
          open={open}
          disabled={isSubmitting}
          label="Collection tag"
          placeholder="Search for a tag or create a new one"
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
          <Alert severity="info">Creating a collection for existing tag "{selectedTag.name}".</Alert>
        ) : null}

        {pendingCreateName ? (
          <Alert severity="info">Creating a new tag and collection for "{pendingCreateName}".</Alert>
        ) : null}

        {selectedTag || pendingCreateName ? (
          <Button
            variant="ghost"
            onClick={resetSelection}
            disabled={isSubmitting}
            sx={{ justifySelf: 'start' }}
          >
            Clear selection
          </Button>
        ) : null}

        {pendingCreateName ? (
          <TextField
            label="Tag notes"
            value={tagNotes}
            onChange={(event) => setTagNotes(event.target.value)}
            placeholder="Optional notes for the new tag"
            fullWidth
            multiline
            minRows={3}
          />
        ) : null}

        <TextField
          label="Collection notes"
          value={collectionNotes}
          onChange={(event) => setCollectionNotes(event.target.value)}
          placeholder="Optional notes for this collection"
          fullWidth
          multiline
          minRows={3}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => void handleSubmit()} loading={isSubmitting}>
          Add Collection
        </Button>
      </DialogActions>
    </Dialog>
  )
}
