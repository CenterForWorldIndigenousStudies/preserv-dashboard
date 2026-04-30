'use client'

import { useMemo, useState, type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import { Button } from '@atoms/Button'
import { CreateTagDialog } from '@atoms/CreateTagDialog'
import { IconPlus } from '@atoms/icons/IconPlus'
import { IconX } from '@atoms/icons/IconX'
import { TagSearchCombobox } from '@molecules/TagSearchCombobox'
import type { TagSuggestion } from '@lib/hooks/useTagSearch'
import type { DocumentToTag } from '@lib/types'
import { normalizeTagName } from '@lib/tag-utils'
import { RemoveTagDialog } from './RemoveTagDialog'

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

    const response = await fetch(`/api/documents/${documentId}/tags`, {
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

    const response = await fetch(`/api/documents/${documentId}/tags`, {
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
      const response = await fetch(`/api/tags/${tag.tag_id}/usage-count`)
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

    const response = await fetch(`/api/documents/${documentId}/tags`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tagId: tagToRemove.tag_id,
        deleteTagFromSystem: options.deleteTagFromSystem,
      }),
    })
    const payload = (await response.json()) as { deletedTag?: boolean; error?: string }

    if (!response.ok) {
      throw new Error(payload.error ?? 'Unable to remove tag.')
    }

    setTags((current) => current.filter((item) => item.id !== tagToRemove.id))
    setTagToRemove(null)
    setUsageCount(null)
    setSuccessMessage(
      payload.deletedTag
        ? `Removed and deleted tag "${tagToRemove.tags.name}".`
        : `Removed tag "${tagToRemove.tags.name}".`,
    )
  }

  return (
    <div className="space-y-4">
      {error ? <Alert severity="error">{error}</Alert> : null}
      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      <div className="flex flex-wrap items-start gap-3">
        {sortedTags.length > 0 ? (
          sortedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-2 rounded-full bg-moss/10 px-3 py-1.5 text-sm text-moss"
            >
              <Tooltip title={tag.tags.notes ?? ''} disableHoverListener={!tag.tags.notes}>
                <span>{tag.tags.name ?? 'Untitled tag'}</span>
              </Tooltip>
              <button
                type="button"
                className="rounded-full p-0.5 text-moss transition hover:bg-moss/10"
                aria-label={`Remove ${tag.tags.name ?? 'tag'}`}
                onClick={() => {
                  void openRemoveDialog(tag)
                }}
              >
                <IconX size={14} />
              </button>
            </span>
          ))
        ) : (
          <p className="text-sm text-ink/60">No tags available.</p>
        )}
      </div>

      {isAdding ? (
        <div className="space-y-3 rounded-2xl border border-moss/10 bg-sand/30 p-4">
          <TagSearchCombobox
            open
            onSelectExisting={addExistingTag}
            onSelectCreate={(tagName) => {
              setPendingCreateName(normalizeTagName(tagName))
            }}
          />
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setIsAdding(false)
                setPendingCreateName('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
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
    </div>
  )
}
