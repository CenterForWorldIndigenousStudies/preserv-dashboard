'use client'

import { useMemo, useReducer, useState, type ReactElement, type ReactNode } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import FormControlLabel from '@mui/material/FormControlLabel'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import { useRouter } from 'next/navigation'

import { DocumentEditActions } from '@molecules/DocumentEditActions'
import { DocumentEditAccessDialog } from '@molecules/DocumentEditAccessDialog'
import { DocumentEditConfirmationDialog } from '@molecules/DocumentEditConfirmationDialog'
import { getDocumentEditAuthorizationPath, getDocumentEditPath } from '@constants/paths'
import { EDITABLE_DOCUMENT_METADATA_FIELDS } from '@constants/documentEditing'
import { DocumentEditContext } from '@lib/hooks/useDocumentEditContext'
import { parseMetadataList, parseMetadataValue } from '@lib/metadata'
import { normalizeDocumentEditValue } from '@lib/documentEditing'
import type { DocumentEditWarning } from '@lib/documentEditAccess'
import type {
  DocumentDetail,
  DocumentToContributor,
  DocumentToPublisher,
  DocumentToTag,
  DocumentQuality,
} from 'types/documents'
import type { MetadataField } from 'types/metadata'
import type {
  DocumentEditChange,
  DocumentEditContributor,
  DocumentEditPublisher,
  DocumentEditSnapshot,
  DocumentEditTag,
  DocumentEditValue,
} from 'types/documentEditing'

interface DocumentEditCoordinatorProps {
  documentId: string
  metadata: MetadataField[]
  quality: DocumentQuality | null
  initialTags: DocumentToTag[]
  initialContributors: DocumentToContributor[]
  initialPublishers: DocumentToPublisher[]
  editWarning?: DocumentEditWarning | null
  toolbarContent?: ReactNode
  children: ReactNode
}

type DraftAction =
  | { type: 'metadata'; name: string; value: DocumentEditValue }
  | { type: 'quality'; field: 'comment' | 'commentAdditional'; value: string | null }
  | { type: 'tags'; tags: DocumentEditTag[] }
  | { type: 'deleteTag'; tagId: string }
  | { type: 'contributors'; contributors: DocumentEditContributor[] }
  | { type: 'publishers'; publishers: DocumentEditPublisher[] }
  | { type: 'reset'; snapshot: DocumentEditSnapshot }

function draftReducer(state: DocumentEditSnapshot, action: DraftAction): DocumentEditSnapshot {
  switch (action.type) {
    case 'metadata':
      return { ...state, metadata: { ...state.metadata, [action.name]: action.value } }
    case 'quality':
      return { ...state, quality: { ...state.quality, [action.field]: action.value } }
    case 'tags':
      return { ...state, tags: action.tags }
    case 'deleteTag':
      return { ...state, deleteTagIds: [...new Set([...(state.deleteTagIds ?? []), action.tagId])] }
    case 'contributors':
      return { ...state, contributors: action.contributors }
    case 'publishers':
      return { ...state, publishers: action.publishers }
    case 'reset':
      return action.snapshot
  }
}

function snapshotsEqual(left: DocumentEditSnapshot, right: DocumentEditSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function parseInitialValue(field: MetadataField): DocumentEditValue {
  if (field.value_type?.toLowerCase() === 'json') {
    const values = parseMetadataList(field.value, field.value_type)
    return values.length > 0 ? values : null
  }

  if (field.value_type?.toLowerCase() === 'boolean') {
    const parsed = parseMetadataValue(field.value, field.value_type).plainText.toLowerCase()
    return parsed === 'true'
  }

  if (field.value_type?.toLowerCase() === 'unix_timestamp') {
    const timestamp = Number(parseMetadataValue(field.value, field.value_type).plainText)
    return Number.isFinite(timestamp) ? timestamp : null
  }

  return normalizeDocumentEditValue(parseMetadataValue(field.value, field.value_type).plainText)
}

function buildInitialSnapshot(
  metadata: MetadataField[],
  quality: DocumentQuality | null,
  initialTags: DocumentToTag[],
  initialContributors: DocumentToContributor[],
  initialPublishers: DocumentToPublisher[],
): DocumentEditSnapshot {
  const allowedNames = new Set<string>(EDITABLE_DOCUMENT_METADATA_FIELDS)
  const editableMetadata = Object.fromEntries(
    metadata
      .filter(
        (field) =>
          allowedNames.has(field.name) &&
          field.name !== 'comment' &&
          field.name !== 'comment_control' &&
          field.name !== 'comment_additional',
      )
      .map((field) => [field.name, parseInitialValue(field)]),
  )

  return {
    metadata: editableMetadata,
    quality: {
      comment: quality?.comment ?? null,
      commentAdditional: quality?.comment_additional ?? null,
    },
    tags: initialTags.map((tag) => ({ tagId: tag.tag_id, name: tag.tags.name ?? 'Untitled tag', notes: tag.notes })),
    contributors: initialContributors.map((contributor) => ({
      contributorId: contributor.contributor_id,
      name: contributor.contributor_name ?? undefined,
      role: contributor.role,
      type: contributor.type,
      notes: contributor.notes,
    })),
    publishers: initialPublishers.map((publisher) => ({
      publisherId: publisher.publisher_id,
      name: publisher.publisher_name ?? undefined,
      notes: publisher.notes,
    })),
    removedTagIds: [],
    deleteTagIds: [],
  }
}

function buildChanges(initial: DocumentEditSnapshot, draft: DocumentEditSnapshot): DocumentEditChange[] {
  const changes: DocumentEditChange[] = []
  const names = new Set([...Object.keys(initial.metadata), ...Object.keys(draft.metadata)])
  for (const name of names) {
    const previousValue = initial.metadata[name] ?? null
    const newValue = draft.metadata[name] ?? null
    if (!valuesEqual(previousValue, newValue)) {
      changes.push({ fieldName: name, previousValue, newValue, summary: `Changed ${name}.` })
    }
  }

  if (initial.quality.comment !== draft.quality.comment) {
    changes.push({
      fieldName: 'comment',
      previousValue: initial.quality.comment,
      newValue: draft.quality.comment,
      summary: 'Changed comment.',
    })
  }
  if (initial.quality.commentAdditional !== draft.quality.commentAdditional) {
    changes.push({
      fieldName: 'comment_additional',
      previousValue: initial.quality.commentAdditional,
      newValue: draft.quality.commentAdditional,
      summary: 'Changed comment additional.',
    })
  }

  if (!valuesEqual(initial.tags, draft.tags))
    changes.push({
      fieldName: 'tags',
      previousValue: initial.tags,
      newValue: draft.tags,
      summary: 'Changed document tags.',
    })
  if (!valuesEqual(initial.contributors, draft.contributors))
    changes.push({
      fieldName: 'contributors',
      previousValue: initial.contributors,
      newValue: draft.contributors,
      summary: 'Changed document contributors.',
    })
  if (!valuesEqual(initial.publishers, draft.publishers))
    changes.push({
      fieldName: 'publishers',
      previousValue: initial.publishers,
      newValue: draft.publishers,
      summary: 'Changed document publishers.',
    })
  return changes
}

interface DocumentEditResponse {
  error?: string
  detail?: DocumentDetail
}

export const EDIT_TOGGLE_LABEL = 'Edit' as const

export function DocumentEditCoordinator({
  documentId,
  metadata,
  quality,
  initialTags,
  initialContributors,
  initialPublishers,
  editWarning = null,
  toolbarContent,
  children,
}: DocumentEditCoordinatorProps): ReactElement {
  const router = useRouter()
  const initialSnapshot = useMemo(
    () => buildInitialSnapshot(metadata, quality, initialTags, initialContributors, initialPublishers),
    [initialContributors, initialPublishers, initialTags, metadata, quality],
  )
  const [draft, dispatch] = useReducer(draftReducer, initialSnapshot)
  const [savedSnapshot, setSavedSnapshot] = useState(initialSnapshot)
  const [isEditing, setIsEditing] = useState(false)
  const [dialog, setDialog] = useState<'save' | 'discard' | null>(null)
  const [editAccessDialogOpen, setEditAccessDialogOpen] = useState(false)
  const [editAccessReason, setEditAccessReason] = useState('')
  const [editAccessError, setEditAccessError] = useState<string | null>(null)
  const [isAuthorizingEdit, setIsAuthorizingEdit] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const isDirty = !snapshotsEqual(savedSnapshot, draft)
  const changes = buildChanges(savedSnapshot, draft)

  function toggleEditing(): void {
    if (!isEditing && editWarning) {
      setEditAccessReason('')
      setEditAccessError(null)
      setEditAccessDialogOpen(true)
      return
    }

    if (isEditing && isDirty) {
      setDialog('discard')
      return
    }
    setIsEditing((current) => !current)
  }

  async function authorizeEditing(): Promise<void> {
    setIsAuthorizingEdit(true)
    setEditAccessError(null)
    try {
      const response = await fetch(getDocumentEditAuthorizationPath(documentId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: editAccessReason }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? 'Unable to enable document editing.')

      setEditAccessDialogOpen(false)
      setEditAccessReason('')
      setIsEditing(true)
      setSuccessMessage('Document moved to the Review Queue and editing enabled.')
      router.refresh()
    } catch (authorizationError) {
      setEditAccessError(
        authorizationError instanceof Error ? authorizationError.message : 'Unable to enable document editing.',
      )
    } finally {
      setIsAuthorizingEdit(false)
    }
  }

  function discardChanges(): void {
    dispatch({ type: 'reset', snapshot: savedSnapshot })
    setDialog(null)
    setIsEditing(false)
    setError(null)
  }

  async function saveChanges(): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch(getDocumentEditPath(documentId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: draft }),
      })
      const payload = (await response.json()) as DocumentEditResponse
      if (!response.ok) throw new Error(payload.error ?? 'Unable to save document changes.')
      if (!payload.detail) throw new Error('The document was saved, but its updated details could not be loaded.')

      const nextSnapshot = buildInitialSnapshot(
        payload.detail.metadata,
        payload.detail.quality,
        payload.detail.document_to_tags,
        payload.detail.document_to_contributors,
        payload.detail.document_to_publishers,
      )
      setSavedSnapshot(nextSnapshot)
      dispatch({ type: 'reset', snapshot: nextSnapshot })
      setDialog(null)
      setIsEditing(false)
      setSuccessMessage('Document changes saved.')
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save document changes.')
      setDialog('save')
    } finally {
      setIsSaving(false)
    }
  }

  const contextValue = useMemo(
    () => ({
      isEditing,
      draft,
      updateMetadata: (name: string, value: DocumentEditValue) => dispatch({ type: 'metadata', name, value }),
      updateQuality: (field: 'comment' | 'commentAdditional', value: string | null) =>
        dispatch({ type: 'quality', field, value }),
      updateTags: (tags: DocumentEditTag[]) => dispatch({ type: 'tags', tags }),
      deleteTag: (tagId: string) => dispatch({ type: 'deleteTag', tagId }),
      updateContributors: (contributors: DocumentEditContributor[]) => dispatch({ type: 'contributors', contributors }),
      updatePublishers: (publishers: DocumentEditPublisher[]) => dispatch({ type: 'publishers', publishers }),
    }),
    [draft, isEditing],
  )

  return (
    <>
      <DocumentEditContext.Provider value={contextValue}>
        <Stack spacing={2}>
          {error ? <Alert severity={'error'}>{error}</Alert> : null}
          <Box
            sx={(theme) => ({
              backgroundColor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              boxShadow: 2,
              px: { xs: 1, md: 1.5 },
              py: 1,
              position: 'sticky',
              top: { xs: 1, md: 2 },
              width: '100%',
              maxWidth: 'fit-content',
              margin: '0 auto',
              zIndex: theme.zIndex.appBar,
            })}
          >
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={{ xs: 1, lg: 2 }}
              sx={{ alignItems: { xs: 'stretch', lg: 'center' }, width: '100%' }}
            >
              {toolbarContent}
              <FormControlLabel
                control={<Switch checked={isEditing} onChange={toggleEditing} disabled={isSaving} />}
                label={EDIT_TOGGLE_LABEL}
                sx={{ m: 0, flexShrink: 0 }}
              />
            </Stack>
          </Box>
          {children}
        </Stack>
      </DocumentEditContext.Provider>

      <DocumentEditActions
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={() => setDialog('save')}
        onCancel={() => setDialog('discard')}
      />
      <DocumentEditConfirmationDialog
        open={dialog !== null}
        mode={dialog ?? 'save'}
        changes={changes}
        error={error}
        isSubmitting={isSaving}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          if (dialog === 'save') void saveChanges()
          if (dialog === 'discard') discardChanges()
        }}
      />
      {editWarning ? (
        <DocumentEditAccessDialog
          open={editAccessDialogOpen}
          warning={editWarning}
          reason={editAccessReason}
          error={editAccessError}
          isSubmitting={isAuthorizingEdit}
          onReasonChange={setEditAccessReason}
          onClose={() => {
            if (!isAuthorizingEdit) {
              setEditAccessDialogOpen(false)
              setEditAccessError(null)
            }
          }}
          onConfirm={() => {
            void authorizeEditing()
          }}
        />
      ) : null}
      <Snackbar
        open={successMessage !== null}
        autoHideDuration={4000}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') {
            setSuccessMessage(null)
          }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={'success'}
          variant={'filled'}
          onClose={() => {
            setSuccessMessage(null)
          }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  )
}
