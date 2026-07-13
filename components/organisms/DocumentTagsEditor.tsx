'use client'

import { useMemo, useState, type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'
import { Button } from '@atoms/Button'
import { CreateTagDialog } from '@atoms/CreateTagDialog'
import { IconPlus } from '@atoms/icons/IconPlus'
import { IconX } from '@atoms/icons/IconX'
import { getDocumentTagsPath, TAGS_PATH } from '@constants/paths'
import type { TagSuggestion } from '@lib/hooks/useTagSearch'
import type { DocumentToTag } from 'types/documents'
import { normalizeTagName } from '@lib/tagUtils'
import { TagSearchCombobox } from '@molecules/TagSearchCombobox'
import { RemoveTagDialog } from '@organisms/RemoveTagDialog'

interface DocumentTagsEditorProps {
  documentId: string
  initialTags: DocumentToTag[]
}

interface DocumentTagResponse {
  documentTag?: DocumentToTag
  error?: string
}

export function DocumentTagsEditor({ documentId, initialTags }: DocumentTagsEditorProps): ReactElement {
  const [tags, setTags] = useState<DocumentToTag[]>(initialTags)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [pendingCreateName, setPendingCreateName] = useState('')
  const [tagToRemove, setTagToRemove] = useState<DocumentToTag | null>(null)
  const [usageCount, setUsageCount] = useState<number | null>(null)
  const sortedTags = useMemo(
    () => [...tags].sort((left, right) => (left.tags.name ?? '').localeCompare(right.tags.name ?? '')),
    [tags],
  )

  function resetMessages(): void {
    setError(null)
    setSuccessMessage(null)
  }

  async function addExistingTag(tag: TagSuggestion): Promise<void> {
    resetMessages()

    const response = await fetch(getDocumentTagsPath(documentId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId: tag.id }),
    })
    const payload = (await response.json()) as DocumentTagResponse

    if (!response.ok || !payload.documentTag) {
      throw new Error(payload.error ?? 'Unable to add tag.')
    }

    const documentTag = payload.documentTag
    setTags((current) => {
      if (current.some((item) => item.id === documentTag.id)) {
        return current
      }

      return [...current, documentTag]
    })
    setIsAdding(false)
    setSuccessMessage(`Added tag "${tag.name}".`)
  }

  async function createAndAttachTag(payload: { name: string; notes: string }): Promise<void> {
    resetMessages()

    const response = await fetch(getDocumentTagsPath(documentId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tagName: payload.name,
        notes: payload.notes,
      }),
    })
    const result = (await response.json()) as DocumentTagResponse

    if (!response.ok || !result.documentTag) {
      throw new Error(result.error ?? 'Unable to create tag.')
    }

    const documentTag = result.documentTag
    setTags((current) => {
      if (current.some((item) => item.id === documentTag.id)) {
        return current
      }

      return [...current, documentTag]
    })
    setPendingCreateName('')
    setIsAdding(false)
    setSuccessMessage(`Created and added tag "${payload.name}".`)
  }

  async function openRemoveDialog(tag: DocumentToTag): Promise<void> {
    resetMessages()
    setTagToRemove(tag)
    setUsageCount(null)

    try {
      const response = await fetch(`${TAGS_PATH}/${tag.tag_id}/usage-count`)
      const payload = (await response.json()) as { count?: number; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to check tag usage.')
      }

      setUsageCount(payload.count ?? 0)
    } catch (usageError) {
      const message = usageError instanceof Error ? usageError.message : 'Unable to check tag usage.'
      setError(message)
    }
  }

  async function confirmRemoveTag(options: { deleteTagFromSystem: boolean }): Promise<void> {
    if (!tagToRemove) {
      return
    }

    const response = options.deleteTagFromSystem
      ? await fetch(`${TAGS_PATH}/${tagToRemove.tag_id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cascade: true }),
        })
      : await fetch(getDocumentTagsPath(documentId), {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tagId: tagToRemove.tag_id,
            deleteTagFromSystem: false,
          }),
        })
    const payload = (await response.json()) as { deletedTag?: boolean; error?: string }

    if (!response.ok) {
      throw new Error(payload.error ?? 'Unable to remove tag.')
    }

    setTags((current) => current.filter((item) => item.tag_id !== tagToRemove.tag_id))
    setTagToRemove(null)
    setUsageCount(null)
    setSuccessMessage(
      options.deleteTagFromSystem
        ? `Removed and deleted tag "${tagToRemove.tags.name}".`
        : `Removed tag "${tagToRemove.tags.name}".`,
    )
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {sortedTags.length > 0 ? (
          sortedTags.map((tag) => (
            <Box
              component="span"
              key={tag.id}
              sx={(theme: Theme) => {
                const mossColor = theme.palette.moss?.main ?? theme.palette.primary.main

                return {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  borderRadius: '9999px',
                  backgroundColor: alpha(mossColor, 0.1),
                  color: mossColor,
                  px: 1.5,
                  py: 0.75,
                }
              }}
            >
              <Tooltip title={tag.tags.notes ?? ''} disableHoverListener={!tag.tags.notes}>
                <Typography component="span" variant="body2" color="inherit">
                  {tag.tags.name ?? 'Untitled tag'}
                </Typography>
              </Tooltip>
              <IconButton
                size="small"
                aria-label={`Remove ${tag.tags.name ?? 'tag'}`}
                onClick={() => {
                  void openRemoveDialog(tag)
                }}
              >
                <IconX size={14} />
              </IconButton>
            </Box>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            No tags available.
          </Typography>
        )}
      </Stack>

      {isAdding ? (
        <Paper
          elevation={0}
          sx={(theme: Theme) => {
            const mossColor = theme.palette.moss?.main ?? theme.palette.primary.main
            const sandColor = theme.palette.sand?.main ?? theme.palette.secondary.main

            return {
              border: 1,
              borderColor: alpha(mossColor, 0.1),
              backgroundColor: alpha(sandColor, 0.3),
              p: 2,
            }
          }}
        >
          <Stack spacing={1.5}>
            <TagSearchCombobox
              open
              onSelectExisting={addExistingTag}
              onSelectCreate={(tagName) => {
                setPendingCreateName(normalizeTagName(tagName))
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsAdding(false)
                  setPendingCreateName('')
                }}
              >
                Cancel
              </Button>
            </Box>
          </Stack>
        </Paper>
      ) : (
        <Button
          variant="primary"
          startIcon={<IconPlus size={16} />}
          onClick={() => {
            resetMessages()
            setIsAdding(true)
          }}
        >
          Add Tag
        </Button>
      )}

      <CreateTagDialog
        open={pendingCreateName.length > 0}
        initialName={pendingCreateName}
        onClose={() => setPendingCreateName('')}
        onCreate={createAndAttachTag}
      />

      <RemoveTagDialog
        open={Boolean(tagToRemove)}
        tagName={tagToRemove?.tags.name ?? ''}
        usageCount={usageCount}
        onClose={() => {
          setTagToRemove(null)
          setUsageCount(null)
        }}
        onConfirm={confirmRemoveTag}
      />
    </Stack>
  )
}
