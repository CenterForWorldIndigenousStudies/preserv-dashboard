'use client'

import { useEffect, useState, useTransition, type ReactElement } from 'react'
import { Alert, Box, Button as MuiButton, Card, CardContent, Stack, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'

import { Button } from '@atoms/Button'
import { getReprocessingStageLabel } from '@lib/reprocessingDrafts'
import type { ReprocessingDraftDetail } from 'types/reprocessingDrafts'
import { ReprocessingDraftDocumentsTable } from '@organisms/ReprocessingDraftDocumentsTable'
import { ReprocessingDraftForm } from '@molecules/ReprocessingDraftForm'
import { ReprocessingDraftSubmissionSummary } from '@molecules/ReprocessingDraftSubmissionSummary'

interface ReprocessingDraftWorkspaceProps {
  initialDraft: ReprocessingDraftDetail | null
}

function draftDetailsHaveChanged(currentDraft: ReprocessingDraftDetail, savedDraft: ReprocessingDraftDetail): boolean {
  return (
    currentDraft.name !== savedDraft.name ||
    (currentDraft.collectionName ?? '') !== (savedDraft.collectionName ?? '') ||
    (currentDraft.collectionNotes ?? '') !== (savedDraft.collectionNotes ?? '') ||
    currentDraft.reason !== savedDraft.reason ||
    currentDraft.restartStage !== savedDraft.restartStage ||
    JSON.stringify(currentDraft.requestedStages) !== JSON.stringify(savedDraft.requestedStages)
  )
}

export function ReprocessingDraftWorkspace({ initialDraft }: ReprocessingDraftWorkspaceProps): ReactElement | null {
  const router = useRouter()
  const [draft, setDraft] = useState(initialDraft)
  const [savedDraft, setSavedDraft] = useState(initialDraft)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setDraft(initialDraft)
    setSavedDraft(initialDraft)
  }, [initialDraft])

  if (!draft) {
    return null
  }
  const currentDraft = draft

  function updateDraftField<
    Field extends keyof Pick<
      ReprocessingDraftDetail,
      'name' | 'collectionName' | 'collectionNotes' | 'restartStage' | 'requestedStages' | 'reason'
    >,
  >(field: Field, value: Pick<ReprocessingDraftDetail, Field>[Field]): void {
    setDraft((current) => (current ? { ...current, [field]: value } : current))
  }

  function saveDraft(): void {
    startTransition(() => {
      void (async () => {
        const { updateReprocessingDraftAction } = await import('@actions/reprocessingDrafts')
        const result = await updateReprocessingDraftAction({
          batchId: currentDraft.id,
          name: currentDraft.name,
          collectionName: currentDraft.collectionName ?? undefined,
          collectionNotes: currentDraft.collectionNotes ?? undefined,
          restartStage: currentDraft.restartStage,
          requestedStages: currentDraft.requestedStages,
          reason: currentDraft.reason,
        })
        if (!result.ok) {
          setError(result.error)
          return
        }
        setError(null)
        setSavedDraft(currentDraft)
        setMessage('Draft saved.')
        router.refresh()
      })().catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'The draft could not be saved.'),
      )
    })
  }

  function removeDocument(documentId: string): void {
    startTransition(() => {
      void (async () => {
        const { removeDocumentFromReprocessingDraftAction } = await import('@actions/reprocessingDrafts')
        const result = await removeDocumentFromReprocessingDraftAction(currentDraft.id, documentId)
        if (!result.ok) {
          setError(result.error)
          return
        }
        setDraft((current) =>
          current
            ? {
                ...current,
                documents: current.documents.filter((document) => document.id !== documentId),
                documentCount: Math.max(current.documentCount - 1, 0),
              }
            : current,
        )
        setMessage('Document removed from the draft.')
      })().catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'The document could not be removed.'),
      )
    })
  }

  function archiveDraft(): void {
    startTransition(() => {
      void (async () => {
        const { archiveReprocessingDraftAction } = await import('@actions/reprocessingDrafts')
        const result = await archiveReprocessingDraftAction(currentDraft.id)
        if (!result.ok) {
          setError(result.error)
          return
        }
        router.push('/process-documents')
        router.refresh()
      })().catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'The draft could not be archived.'),
      )
    })
  }

  function submitDraft(): void {
    startTransition(() => {
      void (async () => {
        const { requestPipelineExecution } = await import('@actions/pipelineExecution')
        const result = await requestPipelineExecution({
          mode: 'reprocess',
          batchId: currentDraft.id,
          draftBatchId: currentDraft.id,
          restartStage: currentDraft.restartStage,
          requestedStages: currentDraft.requestedStages,
          reason: currentDraft.reason,
          collection: currentDraft.collectionName
            ? { name: currentDraft.collectionName, notes: currentDraft.collectionNotes }
            : undefined,
        })
        if (!result.ok) {
          setError(result.error)
          return
        }
        setMessage('Draft submitted and queued for processing.')
        router.refresh()
      })().catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'The draft could not be submitted.'),
      )
    })
  }

  const hasUnsavedChanges = savedDraft !== null && draftDetailsHaveChanged(currentDraft, savedDraft)
  const hasValidDraftDetails = Boolean(currentDraft.name.trim() && currentDraft.reason.trim())
  const canSave = Boolean(hasUnsavedChanges && hasValidDraftDetails)
  const canSubmit = hasValidDraftDetails && currentDraft.documents.length > 0 && !hasUnsavedChanges && !isPending

  return (
    <Card component={'section'} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant={'overline'} color={'primary'}>
              {'Reprocessing cart'}
            </Typography>
            <Typography component={'h2'} variant={'h5'}>
              {currentDraft.name}
            </Typography>
            <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 1 }}>
              {`Restart at ${getReprocessingStageLabel(currentDraft.restartStage)} and choose the stages to run. Edit the batch details before submission.`}
            </Typography>
          </Box>
          <ReprocessingDraftForm
            name={currentDraft.name}
            collectionName={currentDraft.collectionName ?? ''}
            collectionNotes={currentDraft.collectionNotes ?? ''}
            restartStage={currentDraft.restartStage}
            requestedStages={currentDraft.requestedStages}
            reason={currentDraft.reason}
            isSubmitting={isPending}
            canSubmit={canSave}
            error={error}
            onNameChange={(value) => updateDraftField('name', value)}
            onCollectionNameChange={(value) => updateDraftField('collectionName', value)}
            onCollectionNotesChange={(value) => updateDraftField('collectionNotes', value)}
            onRestartStageChange={(value) => updateDraftField('restartStage', value)}
            onRequestedStagesChange={(value) => updateDraftField('requestedStages', value)}
            onReasonChange={(value) => updateDraftField('reason', value)}
            onSubmit={saveDraft}
            submitLabel={'Save draft'}
          />
          <ReprocessingDraftDocumentsTable
            documents={currentDraft.documents}
            disabled={isPending}
            onRemove={removeDocument}
          />
          {currentDraft.documents.length === 0 ? (
            <Alert severity={'warning'}>{'Add at least one document before submitting this draft.'}</Alert>
          ) : null}
          <ReprocessingDraftSubmissionSummary
            documentCount={currentDraft.documents.length}
            restartStage={currentDraft.restartStage}
            requestedStages={currentDraft.requestedStages}
            collectionName={currentDraft.collectionName}
            collectionNotes={currentDraft.collectionNotes}
            reason={currentDraft.reason}
          />
          {message ? <Alert severity={'success'}>{message}</Alert> : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button onClick={submitDraft} disabled={!canSubmit} loading={isPending}>
              {'Submit draft'}
            </Button>
            <MuiButton color={'error'} onClick={archiveDraft} disabled={isPending}>
              {'Discard draft'}
            </MuiButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
