'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { List, ListItem, Stack, Typography } from '@mui/material'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import { alpha } from '@mui/material/styles'
import { Button } from '@atoms/Button'
import { useTagSearch } from '@lib/hooks/useTagSearch'
import { normalizeTagName } from '@lib/tagUtils'

interface CreateTagDialogProps {
  open: boolean
  initialName?: string
  initialNotes?: string
  onClose: () => void
  onCreate: (payload: { name: string; notes: string }) => Promise<void>
}

export function CreateTagDialog({
  open,
  initialName = '',
  initialNotes = '',
  onClose,
  onCreate,
}: CreateTagDialogProps): ReactElement {
  const [name, setName] = useState(initialName)
  const [notes, setNotes] = useState(initialNotes)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const normalizedName = useMemo(() => normalizeTagName(name), [name])
  const { suggestions, isLoading } = useTagSearch(normalizedName, {
    enabled: open && normalizedName.length > 0,
    limit: 7,
  })
  const similarTags = suggestions.filter((tag) => tag.name.toLowerCase() !== normalizedName.toLowerCase())

  useEffect(() => {
    if (!open) {
      return
    }

    setName(initialName)
    setNotes(initialNotes)
    setError(null)
    setIsSubmitting(false)
  }, [initialName, initialNotes, open])

  async function handleCreate(): Promise<void> {
    if (!normalizedName) {
      setError('Tag name is required.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onCreate({
        name: normalizedName,
        notes: notes.trim(),
      })
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Unable to create tag right now.'
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
      <DialogTitle>Create New Tag</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2.5, pt: 1.5 }}>
        {error ? <Alert severity={'error'}>{error}</Alert> : null}
        {normalizedName && similarTags.length > 0 ? (
          <Alert severity={'warning'}>
            {`Found ${similarTags.length} similar ${similarTags.length === 1 ? 'tag' : 'tags'}. Are you sure you want to create a new tag?`}
          </Alert>
        ) : null}
        <TextField
          autoFocus
          label={'Tag name'}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={'Enter a tag name'}
          fullWidth
        />
        <TextField
          label={'Notes'}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={'Optional notes about this tag'}
          fullWidth
          multiline
          minRows={3}
        />
        {normalizedName ? (
          <Stack spacing={1.5}>
            <Typography variant={'body2'} sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {'Similar tags'}
            </Typography>
            {isLoading ? (
              <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
                {'Checking for similar tags...'}
              </Typography>
            ) : similarTags.length > 0 ? (
              <List disablePadding sx={{ display: 'grid', gap: 1 }}>
                {similarTags.map((tag) => (
                  <ListItem
                    key={tag.id}
                    disableGutters
                    sx={(theme) => ({
                      display: 'block',
                      border: '1px solid',
                      borderColor: alpha(theme.palette.primary.main, 0.1),
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.background.default, 0.4),
                      px: 1.5,
                      py: 1,
                    })}
                  >
                    <Typography variant={'body2'} sx={{ color: 'text.primary', fontWeight: 500 }}>
                      {tag.name}
                    </Typography>
                    {tag.notes ? (
                      <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
                        {tag.notes}
                      </Typography>
                    ) : null}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
                {'No similar tags found.'}
              </Typography>
            )}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button variant={'ghost'} onClick={onClose} disabled={isSubmitting}>
          {'Cancel'}
        </Button>
        <Button variant={'primary'} onClick={() => void handleCreate()} loading={isSubmitting}>
          {'Create New Tag'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
