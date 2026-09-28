'use client'

import { useEffect, useState, type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { Button } from '@atoms/Button'
import type { CollectionDeletionPreview } from '@lib/queries/collectionQueries'
import { Modal } from '@organisms/Modal'
import type { CollectionWithMeta } from 'types/collections'

interface CollectionDeleteDialogProps {
  collection: CollectionWithMeta | null
  open: boolean
  preview: CollectionDeletionPreview | null
  isLoadingPreview: boolean
  onClose: () => void
  onConfirm: (deleteTags: boolean) => Promise<void>
}

export function CollectionDeleteDialog({
  collection,
  open,
  preview,
  isLoadingPreview,
  onClose,
  onConfirm,
}: CollectionDeleteDialogProps): ReactElement | null {
  const [deleteTags, setDeleteTags] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDeleteTags(false)
    setIsSubmitting(false)
    setError(null)
  }, [open])

  if (!collection) return null

  async function submit(): Promise<void> {
    if (isLoadingPreview || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm(deleteTags)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete the collection right now.')
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      disableClose={isSubmitting}
      maxWidth={'sm'}
      title={'Remove collection?'}
      contentSx={{ display: 'grid', gap: 2, pt: 1.5 }}
      actions={
        <>
          <Button variant={'ghost'} onClick={onClose} disabled={isSubmitting}>
            {'Cancel'}
          </Button>
          <Button variant={'secondary'} onClick={() => void submit()} loading={isSubmitting} disabled={isLoadingPreview}>
            {'Delete collection'}
          </Button>
        </>
      }
    >
        {error ? <Alert severity={'error'}>{error}</Alert> : null}
        <Typography sx={{ color: 'text.secondary' }}>{`Remove "${collection.collection_name}"?`}</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          {'This removes the collection definition. Tags and document associations remain unless you select the option below.'}
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={deleteTags}
              onChange={(event) => setDeleteTags(event.target.checked)}
              disabled={isLoadingPreview || isSubmitting}
            />
          }
          label={'Also delete tag(s) and remove from all documents'}
        />
        {isLoadingPreview ? <Typography>{'Checking whether collection tags are shared...'}</Typography> : null}
        {preview?.blockedTags.length ? (
          <Stack spacing={1}>
            {preview.blockedTags.map((tag) => (
              <Alert key={tag.tagId} severity={'warning'}>
                {`Tag "${tag.tagName}" cannot be deleted because it is associated with the ${tag.collectionName} collection.`}
              </Alert>
            ))}
            <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
              {'The collection will still be deleted.'}
            </Typography>
          </Stack>
        ) : null}
        {deleteTags && preview && preview.tagsToDelete.length === 0 ? (
          <Alert severity={'info'}>{'No collection tags can be deleted because they are shared.'}</Alert>
        ) : null}
    </Modal>
  )
}
