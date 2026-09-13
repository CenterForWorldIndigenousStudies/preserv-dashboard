'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'

import { Button } from '@atoms/Button'
import { CreateTagDialog } from '@organisms/CreateTagDialog'
import { IconPlus } from '@atoms/icons/IconPlus'
import { ValuePillList } from '@molecules/ValuePillList'
import type { TagSuggestion } from '@lib/hooks/useTagSearch'
import type { DocumentToTag } from 'types/documents'
import type { DocumentEditTag } from 'types/documentEditing'
import { normalizeTagName } from '@lib/tagUtils'
import { TagSearchCombobox } from '@molecules/TagSearchCombobox'
import { RemoveTagDialog } from '@organisms/RemoveTagDialog'
import { TAGS_PATH } from '@constants/paths'
import { useDocumentEditContext } from '@lib/hooks/useDocumentEditContext'

interface DocumentTagsEditorProps {
  documentId: string
  initialTags: DocumentToTag[]
  editable?: boolean
  value?: DocumentEditTag[]
  onChange?: (tags: DocumentEditTag[]) => void
  onDeleteTagFromSystem?: (tagId: string) => void
}

function toDraftTags(initialTags: DocumentToTag[]): DocumentEditTag[] {
  return initialTags.map((tag) => ({
    tagId: tag.tag_id,
    name: tag.tags.name ?? 'Untitled tag',
    notes: tag.notes,
  }))
}

export function DocumentTagsEditor({
  documentId,
  initialTags,
  editable = false,
  value,
  onChange,
  onDeleteTagFromSystem,
}: DocumentTagsEditorProps): ReactElement {
  const editContext = useDocumentEditContext()
  const [localTags, setLocalTags] = useState<DocumentEditTag[]>(() => toDraftTags(initialTags))
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [pendingCreateName, setPendingCreateName] = useState('')
  const [tagToRemove, setTagToRemove] = useState<DocumentEditTag | null>(null)
  const [usageCount, setUsageCount] = useState<number | null>(null)

  const isContextEditing = editContext?.isEditing ?? false
  const isEditable = isContextEditing || editable
  const tags = isContextEditing && editContext ? editContext.draft.tags : value ?? localTags
  const sortedTags = useMemo(
    () => [...tags].sort((left, right) => left.name.localeCompare(right.name)),
    [tags],
  )

  function updateTags(nextTags: DocumentEditTag[]): void {
    if (isContextEditing && editContext) {
      editContext.updateTags(nextTags)
      return
    }

    if (!value) setLocalTags(nextTags)
    onChange?.(nextTags)
  }

  function resetMessages(): void {
    setError(null)
    setSuccessMessage(null)
  }

  function addExistingTag(tag: TagSuggestion): void {
    resetMessages()
    if (tags.some((item) => item.tagId === tag.id)) {
      setError(`Tag "${tag.name}" is already attached to this document.`)
      return
    }

    updateTags([...tags, { tagId: tag.id, name: tag.name, notes: null }])
    setIsAdding(false)
    setSuccessMessage(`Added tag "${tag.name}" to the staged changes.`)
  }

  function createAndAttachTag(payload: { name: string; notes: string }): Promise<void> {
    resetMessages()
    const name = normalizeTagName(payload.name)
    if (!name) throw new Error('Tag name is required.')

    updateTags([...tags, { name, notes: payload.notes.trim() || null }])
    setPendingCreateName('')
    setIsAdding(false)
    setSuccessMessage(`Created and added tag "${name}" to the staged changes.`)
    return Promise.resolve()
  }

  function confirmRemoveTag(options: { deleteTagFromSystem: boolean }): Promise<void> {
    if (!tagToRemove) return Promise.resolve()

    updateTags(tags.filter((tag) => (tag.tagId ? tag.tagId !== tagToRemove.tagId : tag.name !== tagToRemove.name)))
    if (options.deleteTagFromSystem && tagToRemove.tagId) {
      if (isContextEditing && editContext) editContext.deleteTag(tagToRemove.tagId)
      onDeleteTagFromSystem?.(tagToRemove.tagId)
    }
    setTagToRemove(null)
    setSuccessMessage(`Removed tag "${tagToRemove.name}" from the staged changes.`)
    return Promise.resolve()
  }

  useEffect(() => {
    const tagId = tagToRemove?.tagId
    if (!tagId) {
      setUsageCount(tagToRemove ? 0 : null)
      return
    }

    const controller = new AbortController()
    setUsageCount(null)
    void fetch(`${TAGS_PATH}/${encodeURIComponent(tagId)}/usage-count`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as { count?: number }
        if (!response.ok || typeof payload.count !== 'number') {
          throw new Error('Unable to load tag usage.')
        }
        setUsageCount(payload.count)
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
        setUsageCount(null)
      })

    return () => controller.abort()
  }, [documentId, tagToRemove])

  return (
    <Stack spacing={2}>
      {error ? <Alert severity={'error'}>{error}</Alert> : null}
      {successMessage ? <Alert severity={'success'}>{successMessage}</Alert> : null}

      <Stack direction={'row'} spacing={1.5} useFlexGap sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {sortedTags.length > 0 ? (
          <ValuePillList
            values={sortedTags.map((tag) => tag.name)}
            getTooltip={(_, index) => sortedTags[index]?.notes ?? null}
            onRemove={isEditable ? (_, index) => setTagToRemove(sortedTags[index] ?? null) : undefined}
          />
        ) : (
          <Typography variant={'body2'} color={'text.secondary'}>
            {'No tags available.'}
          </Typography>
        )}
      </Stack>

      {isEditable ? (
        isAdding ? (
          <Paper
            elevation={0}
            sx={(theme: Theme) => ({
              border: 1,
              borderColor: alpha(theme.palette.primary.main, 0.1),
              backgroundColor: alpha(theme.palette.background.default, 0.3),
              p: 2,
            })}
          >
            <Stack spacing={1.5}>
              <TagSearchCombobox
                open
                onSelectExisting={addExistingTag}
                onSelectCreate={(tagName) => setPendingCreateName(normalizeTagName(tagName))}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant={'ghost'}
                  onClick={() => {
                    setIsAdding(false)
                    setPendingCreateName('')
                  }}
                >
                  {'Cancel'}
                </Button>
              </Box>
            </Stack>
          </Paper>
        ) : (
          <Button
            variant={'primary'}
            startIcon={<IconPlus size={16} />}
            onClick={() => {
              resetMessages()
              setIsAdding(true)
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            {'Add Tag'}
          </Button>
        )
      ) : null}

      <CreateTagDialog
        open={pendingCreateName.length > 0}
        initialName={pendingCreateName}
        onClose={() => setPendingCreateName('')}
        onCreate={createAndAttachTag}
      />

      <RemoveTagDialog
        open={Boolean(tagToRemove)}
        tagName={tagToRemove?.name ?? ''}
        usageCount={usageCount}
        onClose={() => setTagToRemove(null)}
        onConfirm={confirmRemoveTag}
      />
    </Stack>
  )
}
