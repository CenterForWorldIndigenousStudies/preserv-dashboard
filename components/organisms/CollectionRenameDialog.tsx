'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'

import { renameCollectionAction } from '@actions/collections'
import { Button } from '@atoms/Button'
import { TagSearchCombobox } from '@molecules/TagSearchCombobox'
import { Modal } from '@organisms/Modal'
import type { TagSuggestion } from '@lib/hooks/useTagSearch'
import type { CollectionWithMeta } from 'types/collections'

interface CollectionRenameDialogProps {
  collection: CollectionWithMeta | null
  open: boolean
  onClose: () => void
}

export function CollectionRenameDialog({ collection, open, onClose }: CollectionRenameDialogProps): ReactElement | null {
  const router = useRouter()
  const [nextTag, setNextTag] = useState<TagSuggestion | null>(null)
  const [nextTagName, setNextTagName] = useState('')
  const [keepCurrentMembers, setKeepCurrentMembers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setNextTag(null)
    setNextTagName('')
    setKeepCurrentMembers(true)
    setError(null)
    setIsSubmitting(false)
  }, [open])

  if (!collection) return null
  const activeCollection = collection

  async function submit(): Promise<void> {
    if (!nextTag && !nextTagName) {
      setError('Choose an existing tag or enter a new collection name.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await renameCollectionAction({
        collectionId: activeCollection.id,
        nextCanonicalTagId: nextTag?.id,
        nextCanonicalTagName: nextTagName,
        keepCurrentMembers,
      })
      onClose()
      router.refresh()
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Unable to rename the collection right now.')
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      disableClose={isSubmitting}
      title={'Rename Collection'}
      contentSx={{ display: 'grid', gap: 2.5, pt: 1.5 }}
      actions={
        <>
          <Button variant={'ghost'} onClick={onClose} disabled={isSubmitting}>
            {'Cancel'}
          </Button>
          <Button variant={'primary'} onClick={() => void submit()} loading={isSubmitting}>
            {'Rename collection'}
          </Button>
        </>
      }
    >
        {error ? <Alert severity={'error'}>{error}</Alert> : null}
        <TagSearchCombobox
          open={open}
          disabled={isSubmitting}
          label={'New collection name'}
          placeholder={'Search for a tag or create a new one'}
          onSelectExisting={(tag) => {
            setNextTag(tag)
            setNextTagName('')
          }}
          onSelectCreate={(name) => {
            setNextTagName(name)
            setNextTag(null)
          }}
          getOptionDisabled={(tag) => tag.id === collection.tag_id}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={keepCurrentMembers}
              onChange={(event) => setKeepCurrentMembers(event.target.checked)}
              disabled={isSubmitting}
            />
          }
          label={'Keep currently associated documents'}
        />
    </Modal>
  )
}
