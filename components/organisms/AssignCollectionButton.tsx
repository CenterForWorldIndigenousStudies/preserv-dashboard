'use client'

import { useCallback, useEffect, useState, type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Button } from '@atoms/Button'
import { IconX } from '@atoms/icons/IconX'
import { DOCUMENTS_API_PATH, getDocumentCollectionsPath } from '@constants/paths'
import { TagPill } from '@atoms/TagPill'

interface AssignCollectionButtonProps {
  /** The document ID to update */
  documentId: string
  /** Tags already assigned to this document */
  currentTags: string[]
}

interface CollectionTagsResponse {
  collections?: string[]
  error?: string
}

interface SaveCollectionTagsResponse {
  id?: string
  collection_tags?: string[]
  error?: string
}

/**
 * Path B fallback UI for manual Collection tag assignment.
 *
 * Renders an inline "Assign Collection" control on the document detail page.
 * Shown when a document has no collection_tags at ingest time (Path A = assigned
 * at ingest, Path B = assigned later by a human). Allows a human to select one
 * or more collections from the pool of known collection tags and persist the
 * selection to the MySQL documents table via PATCH /api/documents/[id].
 */
export function AssignCollectionButton({ documentId, currentTags }: AssignCollectionButtonProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags)
  const [customTag, setCustomTag] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingTags, setIsFetchingTags] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Load available collection tags when modal opens
  useEffect(() => {
    if (!isOpen) return

    setIsFetchingTags(true)
    setError(null)

    fetch(getDocumentCollectionsPath(documentId))
      .then(async (res): Promise<CollectionTagsResponse> => res.json() as Promise<CollectionTagsResponse>)
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setAvailableTags(data.collections ?? [])
        }
      })
      .catch(() => setError('Failed to load available collections.'))
      .finally(() => setIsFetchingTags(false))
  }, [isOpen, documentId])

  // Sync selected tags when currentTags change from parent (e.g., after save)
  useEffect(() => {
    setSelectedTags(currentTags)
  }, [currentTags])

  const openModal = useCallback(() => {
    setIsOpen(true)
    setSuccess(false)
    setError(null)
    setCustomTag('')
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }, [])

  const addCustomTag = useCallback(() => {
    const trimmedTag = customTag.trim()
    if (!trimmedTag) return

    toggleTag(trimmedTag)
    setCustomTag('')
  }, [customTag, toggleTag])

  const handleSave = useCallback(async () => {
    const tagsToSave = selectedTags.filter((t) => t.trim().length > 0)
    if (customTag.trim().length > 0 && !tagsToSave.includes(customTag.trim())) {
      tagsToSave.push(customTag.trim())
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${DOCUMENTS_API_PATH}/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection_tags: tagsToSave }),
      })

      const data = (await res.json()) as SaveCollectionTagsResponse

      if (!res.ok) {
        setError(data.error ?? 'Failed to save collection tags.')
        return
      }

      setSuccess(true)
      // Update parent state by reloading the page data
      // The parent component will re-fetch document detail
      setTimeout(() => {
        closeModal()
        // Force Next.js to re-render the page by navigating to itself
        window.location.reload()
      }, 800)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedTags, customTag, documentId, closeModal])

  const alreadyAssigned = currentTags.length > 0

  return (
    <>
      {/* Trigger button — shown in the Collection Tags field row on the detail page */}
      <Stack direction={'row'} spacing={1.5} sx={{ alignItems: 'center', mt: 1.5 }}>
        {alreadyAssigned ? (
          <Stack direction={'row'} spacing={0.5} sx={{ alignItems: 'baseline' }}>
            <Typography variant={'caption'} color={'text.secondary'}>
              {'Tags assigned.'}
            </Typography>
            <Button
              onClick={openModal}
              variant={'ghost'}
              size={'sm'}
              sx={{
                minWidth: 0,
                p: 0,
                verticalAlign: 'baseline',
                textDecoration: 'underline',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {'Edit assignment'}
            </Button>
          </Stack>
        ) : (
          <Button onClick={openModal} variant={'primary'}>
            {'Assign Collection'}
          </Button>
        )}
      </Stack>

      {/* Modal dialog */}
      <Dialog
        open={isOpen}
        onClose={isLoading ? undefined : closeModal}
        fullWidth
        maxWidth={'sm'}
        aria-labelledby={'assign-collection-dialog-title'}
        sx={{ '& .MuiDialog-paper': { borderRadius: 2 } }}
      >
        <DialogTitle
          id={'assign-collection-dialog-title'}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}
        >
          {'Assign Collection'}
          <IconButton onClick={closeModal} disabled={isLoading} aria-label={'Close'}>
            <IconX size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: 'grid', gap: 2.5, pt: 1.5 }}>
          <Typography variant={'body2'} color={'text.secondary'}>
            {`Select one or more collections to assign to this document. This is the Path B fallback for documents that arrived without a{' '}`}
            <Box component={'code'} sx={{ fontSize: '0.75rem' }}>
              {'primary_collection_tag'}
            </Box>
            .
          </Typography>

          {error ? <Alert severity={'error'}>{error}</Alert> : null}

          {success ? <Alert severity={'success'}>{'Collection tags saved. Reloading...'}</Alert> : null}

          {isFetchingTags ? (
            <Button loading variant={'ghost'}>
              {'Loading available collections...'}
            </Button>
          ) : (
            <>
              {/* Existing tag selections */}
              {availableTags.length > 0 && (
                <Box>
                  <Typography variant={'overline'} color={'text.secondary'}>
                    {'Known Collections'}
                  </Typography>
                  <Stack direction={'row'} spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
                    {availableTags.map((tag) => (
                      <Button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        variant={selectedTags.includes(tag) ? 'primary' : 'secondary'}
                        size={'sm'}
                        sx={{ borderRadius: '9999px', px: 1.5, py: 0.5 }}
                      >
                        {tag}
                      </Button>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Custom tag input */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
                <TextField
                  label={'Add Custom Collection'}
                  value={customTag}
                  onChange={(event) => setCustomTag(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addCustomTag()
                    }
                  }}
                  placeholder={'Enter collection name...'}
                  size={'small'}
                  fullWidth
                />
                <Button
                  onClick={addCustomTag}
                  variant={'primary'}
                  size={'sm'}
                  sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'center' } }}
                >
                  {'Add'}
                </Button>
              </Stack>

              {/* Selected preview */}
              {selectedTags.length > 0 && (
                <Box>
                  <Typography variant={'overline'} color={'text.secondary'}>
                    {`Selected (${selectedTags.length})`}
                  </Typography>
                  <Stack direction={'row'} spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
                    {selectedTags.map((tag) => (
                      <TagPill key={tag} tag={tag} onRemove={toggleTag} />
                    ))}
                  </Stack>
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pt: 2, pb: 3 }}>
          <Button onClick={closeModal} variant={'ghost'} disabled={isLoading}>
            {'Cancel'}
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={isLoading || selectedTags.length === 0}
            variant={'primary'}
            loading={isLoading}
          >
            {'Save Collection Tags'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
