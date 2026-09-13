'use client'

import { useState, type ReactElement } from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useRouter } from 'next/navigation'

import { type BadgeVariant } from '@atoms/Badges/Badge'
import { StatusPill } from '@atoms/Badges/StatusPill'
import {
  buildDefaultReviewQueueChecklistState,
  type ReviewQueueChecklistItemKey,
  type ReviewQueueChecklistState,
} from '@constants/reviewQueueChecklist'
import { DEFAULT_REPROCESSING_START_STAGE } from '@lib/reprocessingDrafts'
import { NeedsReviewReasonsPopover } from '@molecules/NeedsReviewReasonsPopover'
import { DocumentRoleBadges } from '@molecules/DocumentRoleBadges'
import { ReviewQueueActionButton } from '@molecules/ReviewQueueActionButton'
import { ReviewQueueReprocessDialog } from '@organisms/ReviewQueueReprocessDialog'
import { ReviewQueueChecklistPanel } from '@organisms/ReviewQueueChecklistPanel'
import type { ReviewQueueDecision } from 'types/reviewQueue'
import type { ReprocessingDraftSummary } from 'types/reprocessingDrafts'
import type { CallbackStageKey } from 'types/pipelineContracts'
import type { NeedsReviewReasonGroup } from 'types/needsReview'

interface DocumentReviewToolbarProps {
  documentId: string
  documentName: string
  validationStatus?: string | null
  reviewReasons?: NeedsReviewReasonGroup[]
  reviewChecklist?: ReviewQueueChecklistState | null
  isCandidate: boolean
  isCanonical: boolean
  hasOpenReprocessingDraft: boolean
  initialDrafts: ReprocessingDraftSummary[]
  diagnosticsHref?: string
}

function getValidationStatusBadgeVariant(status: string | null | undefined): BadgeVariant {
  switch ((status ?? '').toUpperCase()) {
    case 'APPROVED':
    case 'VALIDATED':
      return 'success'
    case 'NEEDS_REVIEW':
    case 'FORMAT_ERRORS':
    case 'GENERAL_ERRORS':
    case 'METADATA_ISSUES':
    case 'REJECTED':
      return 'danger'
    default:
      return 'neutral'
  }
}

async function updateChecklist(
  documentId: string,
  itemKey: ReviewQueueChecklistItemKey,
  completed: boolean,
): Promise<{ ok: true; checklist: ReviewQueueChecklistState } | { ok: false; error: string }> {
  const { updateReviewQueueChecklistAction } = await import('@actions/review-queue')
  return updateReviewQueueChecklistAction(documentId, itemKey, completed)
}

async function applyDecision(
  documentId: string,
  decision: ReviewQueueDecision,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const { applyReviewQueueDecisionAction } = await import('@actions/review-queue')
  return applyReviewQueueDecisionAction(documentId, decision)
}

export function DocumentReviewToolbar({
  documentId,
  documentName,
  validationStatus,
  reviewReasons = [],
  reviewChecklist,
  isCandidate,
  isCanonical,
  hasOpenReprocessingDraft,
  initialDrafts,
  diagnosticsHref,
}: DocumentReviewToolbarProps): ReactElement {
  const router = useRouter()
  const [batchActionPending, setBatchActionPending] = useState(false)
  const [checklistState, setChecklistState] = useState(reviewChecklist ?? buildDefaultReviewQueueChecklistState())
  const [reprocessOpen, setReprocessOpen] = useState(false)
  const [reprocessMode, setReprocessMode] = useState<'create' | 'existing'>('create')
  const [reprocessName, setReprocessName] = useState('')
  const [reprocessCollectionName, setReprocessCollectionName] = useState('')
  const [reprocessCollectionNotes, setReprocessCollectionNotes] = useState('')
  const [reprocessStage, setReprocessStage] = useState<CallbackStageKey>(DEFAULT_REPROCESSING_START_STAGE)
  const [reprocessReason, setReprocessReason] = useState('')
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [reprocessPending, setReprocessPending] = useState(false)
  const [reprocessError, setReprocessError] = useState<string | null>(null)
  const [toastState, setToastState] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const statusLabel = validationStatus ?? (reviewReasons.length > 0 ? 'Review' : null)
  function showError(message: string): void {
    setToastState({ open: true, message, severity: 'error' })
  }

  async function handleChecklistToggle(itemKey: ReviewQueueChecklistItemKey): Promise<void> {
    if (batchActionPending) return
    const previousState = checklistState
    const completed = !previousState[itemKey]
    setChecklistState({ ...previousState, [itemKey]: completed })

    try {
      const result = await updateChecklist(documentId, itemKey, completed)
      if (result.ok) {
        setChecklistState(result.checklist)
        return
      }
      setChecklistState(previousState)
      showError(result.error)
    } catch (error: unknown) {
      setChecklistState(previousState)
      showError(error instanceof Error ? error.message : 'The review checklist could not be saved.')
    }
  }

  async function handleDecision(decision: ReviewQueueDecision): Promise<void> {
    if (batchActionPending) return
    setBatchActionPending(true)
    try {
      const result = await applyDecision(documentId, decision)
      if (!result.ok) {
        showError(result.error)
        return
      }
      setToastState({ open: true, message: result.message, severity: 'success' })
      router.refresh()
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'The document decision could not be saved.')
    } finally {
      setBatchActionPending(false)
    }
  }

  async function handleRemoveFromDraft(): Promise<void> {
    if (batchActionPending) return
    setBatchActionPending(true)
    try {
      const { removeDocumentsFromReprocessingDraftsAction } = await import('@actions/reprocessingDrafts')
      const result = await removeDocumentsFromReprocessingDraftsAction([documentId])
      if (!result.ok) {
        showError(result.error)
        return
      }
      setToastState({
        open: true,
        message:
          result.removedDocumentIds.length > 0
            ? 'Document removed from the reprocessing draft.'
            : 'Document was not in an open reprocessing draft.',
        severity: 'success',
      })
      router.refresh()
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'The document could not be removed from the draft.')
    } finally {
      setBatchActionPending(false)
    }
  }

  function openReprocessDialog(): void {
    setReprocessMode('create')
    setReprocessName('')
    setReprocessCollectionName('')
    setReprocessCollectionNotes('')
    setReprocessStage(DEFAULT_REPROCESSING_START_STAGE)
    setReprocessReason('')
    setSelectedDraftId(null)
    setReprocessError(null)
    setReprocessOpen(true)
  }

  async function submitReprocessDraft(): Promise<void> {
    if (reprocessPending) return
    setReprocessPending(true)
    setReprocessError(null)
    try {
      const actions = await import('@actions/reprocessingDrafts')
      const result =
        reprocessMode === 'create'
          ? await actions.createReprocessingDraftForDocumentsAction({
              documentIds: [documentId],
              name: reprocessName,
              collectionName: reprocessCollectionName,
              collectionNotes: reprocessCollectionNotes,
              restartStage: reprocessStage,
              reason: reprocessReason,
            })
          : selectedDraftId
            ? await actions.addDocumentsToReprocessingDraftAction({
                batchId: selectedDraftId,
                documentIds: [documentId],
              })
            : { ok: false as const, error: 'Select an existing draft batch.' }
      if (!result.ok) {
        setReprocessError(result.error)
        return
      }
      setReprocessOpen(false)
      setToastState({ open: true, message: 'Document added to the reprocessing draft.', severity: 'success' })
      router.refresh()
    } catch (error: unknown) {
      setReprocessError(error instanceof Error ? error.message : 'The document could not be added.')
    } finally {
      setReprocessPending(false)
    }
  }

  return (
    <>
      <Stack
        component={'section'}
        aria-label={'Document review controls'}
        direction={{ xs: 'column', lg: 'row' }}
        spacing={{ xs: 1.5, lg: 2.5 }}
        sx={{ alignItems: { xs: 'stretch', lg: 'center' }, flex: 1, minWidth: 0 }}
      >
        <Stack direction={'row'} spacing={{ xs: 1, lg: 1.5 }} sx={{ alignItems: 'center', flexShrink: 0 }}>
          {isCandidate || isCanonical ? (
            <DocumentRoleBadges isCandidate={isCandidate} isCanonical={isCanonical} />
          ) : null}
          <ReviewQueueActionButton
            batchActionPending={batchActionPending}
            selectedCount={1}
            hasSelectedDraftDocuments={hasOpenReprocessingDraft}
            onApprove={() => {
              void handleDecision('APPROVED')
            }}
            onReject={() => {
              void handleDecision('REJECTED')
            }}
            onReprocess={openReprocessDialog}
            onRemove={() => {
              void handleRemoveFromDraft()
            }}
          />
        </Stack>
        <Stack spacing={0.5} sx={{ minWidth: { lg: 150 } }}>
          {statusLabel ? (
            reviewReasons.length > 0 ? (
              <NeedsReviewReasonsPopover
                documentId={documentId}
                groups={reviewReasons}
                trigger={
                  <StatusPill status={statusLabel} variant={getValidationStatusBadgeVariant(validationStatus)} />
                }
                triggerLabel={`View review reasons for document ${documentId}`}
                diagnosticsHref={diagnosticsHref}
              />
            ) : (
              <StatusPill status={statusLabel} variant={getValidationStatusBadgeVariant(validationStatus)} />
            )
          ) : (
            <Typography variant={'body2'} color={'text.secondary'}>
              {'-'}
            </Typography>
          )}
        </Stack>
        <Stack spacing={0.5} sx={{ minWidth: { lg: 140 } }}>
          <ReviewQueueChecklistPanel
            documentId={documentId}
            checklistState={checklistState}
            onToggle={(itemKey) => {
              void handleChecklistToggle(itemKey)
            }}
          />
        </Stack>
      </Stack>
      <Snackbar
        open={toastState.open}
        autoHideDuration={4000}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') setToastState((current) => ({ ...current, open: false }))
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toastState.severity}
          variant={'filled'}
          onClose={() => setToastState((current) => ({ ...current, open: false }))}
        >
          {toastState.message}
        </Alert>
      </Snackbar>
      <ReviewQueueReprocessDialog
        open={reprocessOpen}
        documentName={documentName}
        mode={reprocessMode}
        name={reprocessName}
        collectionName={reprocessCollectionName}
        collectionNotes={reprocessCollectionNotes}
        restartStage={reprocessStage}
        reason={reprocessReason}
        drafts={initialDrafts}
        selectedDraftId={selectedDraftId}
        pending={reprocessPending}
        canCreate={Boolean(reprocessName.trim() && reprocessReason.trim())}
        error={reprocessError}
        onClose={() => setReprocessOpen(false)}
        onModeChange={setReprocessMode}
        onNameChange={setReprocessName}
        onCollectionNameChange={setReprocessCollectionName}
        onCollectionNotesChange={setReprocessCollectionNotes}
        onRestartStageChange={setReprocessStage}
        onReasonChange={setReprocessReason}
        onSelectedDraftChange={(draft) => setSelectedDraftId(draft?.id ?? null)}
        onSubmit={() => {
          void submitReprocessDraft()
        }}
      />
    </>
  )
}
