'use client'

import { useEffect, useState, useTransition, type ReactElement } from 'react'
import { Alert, Box, Button as MuiButton, Card, CardContent, Stack, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'

import { Button } from '@atoms/Button'
import {
  getDefaultReprocessingPipelineConfig,
  getReprocessingDownstreamStages,
  pipelineConfigToReprocessingRequestedStages,
  REPROCESSING_STAGE_OPTIONS,
} from '@lib/reprocessingDrafts'
import {
  BATCH_DRAFT_STAGE_OPTIONS,
  batchDraftPipelineConfigToRequestedStages,
  getBatchDraftDownstreamStages,
  getBatchDraftStageLabel,
  getDefaultBatchDraftPipelineConfig,
} from '@lib/batchDraftPipeline'
import type { ReprocessingDraftDetail } from 'types/reprocessingDrafts'
import { ReprocessingDraftDocumentsTable } from '@organisms/ReprocessingDraftDocumentsTable'
import { BatchDraftForm } from '@molecules/BatchDraftForm'
import { ReprocessingDraftSubmissionSummary } from '@molecules/ReprocessingDraftSubmissionSummary'
import { GoogleDriveFolderTree } from '@molecules/GoogleDriveFolderTree'
import { ProcessSelectedFoldersPanel } from '@molecules/ProcessSelectedFoldersPanel'
import type { DriveFolderOption } from '@lib/googleDrive'

export const SUBMIT_LABEL = 'Process batch'
export interface BatchDraftWorkspaceProps {
  initialDraft: ReprocessingDraftDetail | null
  rootFolders?: DriveFolderOption[]
  childFoldersByParent?: Record<string, DriveFolderOption[]>
  expandedFolderIds?: Record<string, boolean>
  selectedFolders?: Record<string, DriveFolderOption>
  foldersError?: string | null
  onToggleFolderSelection?: (folder: DriveFolderOption) => void
  onToggleFolderExpansion?: (folderId: string) => void
  onGoogleDriveExpandedChange?: (expanded: boolean) => void
}

function draftDetailsHaveChanged(
  currentDraft: ReprocessingDraftDetail,
  savedDraft: ReprocessingDraftDetail,
  currentSourceFolderIds: readonly string[],
): boolean {
  return (
    currentDraft.name !== savedDraft.name ||
    (currentDraft.collectionName ?? '') !== (savedDraft.collectionName ?? '') ||
    (currentDraft.collectionNotes ?? '') !== (savedDraft.collectionNotes ?? '') ||
    currentDraft.reason !== savedDraft.reason ||
    currentDraft.restartStage !== savedDraft.restartStage ||
    JSON.stringify(currentDraft.requestedStages) !== JSON.stringify(savedDraft.requestedStages) ||
    JSON.stringify(currentDraft.pipelineConfig) !== JSON.stringify(savedDraft.pipelineConfig) ||
    JSON.stringify(currentSourceFolderIds) !== JSON.stringify(savedDraft.sourceFolderIds ?? [])
  )
}

// This component intentionally coordinates the form, source controls, draft mutations, and submission state.
// Keep those transitions together so the draft cannot be submitted with stale source or stage state.
// eslint-disable-next-line complexity -- The workspace coordinates several related draft transitions.
export function BatchDraftWorkspace({
  initialDraft,
  rootFolders = [],
  childFoldersByParent = {},
  expandedFolderIds = {},
  selectedFolders,
  foldersError = null,
  onToggleFolderSelection,
  onToggleFolderExpansion,
  onGoogleDriveExpandedChange,
}: BatchDraftWorkspaceProps): ReactElement | null {
  const router = useRouter()
  const [draft, setDraft] = useState(initialDraft)
  const [savedDraft, setSavedDraft] = useState(initialDraft)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [googleDriveExpanded, setGoogleDriveExpanded] = useState(true)

  useEffect(() => {
    setDraft(initialDraft)
    setSavedDraft(initialDraft)
  }, [initialDraft])

  if (!draft) {
    return null
  }
  const currentDraft = draft
  const selectedFolderList = selectedFolders ? Object.values(selectedFolders) : []
  const currentSourceFolderIds = selectedFolders
    ? Object.keys(selectedFolders)
    : [...(currentDraft.sourceFolderIds ?? [])]

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
        const { updateBatchDraftAction } = await import('@actions/batchDrafts')
        const sourceFolderIds = selectedFolders
          ? Object.keys(selectedFolders)
          : [...(currentDraft.sourceFolderIds ?? [])]
        const result = await updateBatchDraftAction({
          batchId: currentDraft.id,
          name: currentDraft.name,
          collectionName: currentDraft.collectionName ?? undefined,
          collectionNotes: currentDraft.collectionNotes ?? undefined,
          restartStage: currentDraft.restartStage,
          requestedStages: currentDraft.requestedStages,
          pipelineConfig: currentDraft.pipelineConfig,
          sourceFolderIds,
          sourceDocumentIds: currentDraft.documents.map((document) => document.id),
          reason: currentDraft.reason,
        })
        if (!result.ok) {
          setError(result.error)
          return
        }
        setError(null)
        const savedValue: ReprocessingDraftDetail = {
          ...currentDraft,
          sourceFolderIds: currentSourceFolderIds,
          pipelineConfig: currentDraft.pipelineConfig
            ? { ...currentDraft.pipelineConfig, sourceFolderIds: currentSourceFolderIds }
            : currentDraft.pipelineConfig,
        }
        setDraft(savedValue)
        setSavedDraft(savedValue)
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
        const { removeDocumentFromBatchDraftAction } = await import('@actions/batchDrafts')
        const result = await removeDocumentFromBatchDraftAction(currentDraft.id, documentId)
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
        const { archiveBatchDraftAction } = await import('@actions/batchDrafts')
        const result = await archiveBatchDraftAction(currentDraft.id)
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
        const executionMode =
          currentDraft.executionMode ?? (currentDraft.pipelineConfig?.sourceFolderIds?.length ? 'normal' : 'reprocess')
        const result = await requestPipelineExecution({
          mode: executionMode,
          batchId: currentDraft.id,
          draftBatchId: currentDraft.id,
          restartStage: currentDraft.restartStage,
          requestedStages: currentDraft.requestedStages,
          pipelineConfig: currentDraft.pipelineConfig,
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

  const hasUnsavedChanges =
    savedDraft !== null && draftDetailsHaveChanged(currentDraft, savedDraft, currentSourceFolderIds)
  const hasValidDraftDetails = Boolean(currentDraft.name.trim() && currentDraft.reason.trim())
  const canSave = Boolean(hasUnsavedChanges && hasValidDraftDetails)
  const hasSources = currentDraft.documents.length > 0 || currentSourceFolderIds.length > 0
  const canSubmit = hasValidDraftDetails && hasSources && !hasUnsavedChanges && !isPending

  return (
    <Card component={'section'} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant={'overline'} color={'primary'}>
              {'Batch cart'}
            </Typography>
            <Typography component={'h2'} variant={'h5'}>
              {currentDraft.name}
            </Typography>
            <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 1 }}>
              {`Start at ${getBatchDraftStageLabel(currentDraft.restartStage)} and choose the stages to run. Edit the batch details before submission.`}
            </Typography>
          </Box>
          <BatchDraftForm
            name={currentDraft.name}
            collectionName={currentDraft.collectionName ?? ''}
            collectionNotes={currentDraft.collectionNotes ?? ''}
            startStage={currentDraft.restartStage}
            requestedStages={currentDraft.requestedStages}
            pipelineConfig={currentDraft.pipelineConfig}
            reason={currentDraft.reason}
            isSubmitting={isPending}
            canSubmit={canSave}
            error={error}
            onNameChange={(value) => updateDraftField('name', value)}
            onCollectionNameChange={(value) => updateDraftField('collectionName', value)}
            onCollectionNotesChange={(value) => updateDraftField('collectionNotes', value)}
            onStartStageChange={(value) => updateDraftField('restartStage', value)}
            onRequestedStagesChange={(value) => updateDraftField('requestedStages', value)}
            onPipelineConfigChange={(config) => {
              setDraft((current) =>
                current
                  ? {
                      ...current,
                      pipelineConfig: config,
                      requestedStages:
                        currentDraft.executionMode === 'normal'
                          ? batchDraftPipelineConfigToRequestedStages(config)
                          : pipelineConfigToReprocessingRequestedStages(config),
                    }
                  : current,
              )
            }}
            onReasonChange={(value) => updateDraftField('reason', value)}
            onSubmit={saveDraft}
            submitLabel={'Save draft'}
            stageOptions={
              currentDraft.executionMode === 'normal' ? BATCH_DRAFT_STAGE_OPTIONS : REPROCESSING_STAGE_OPTIONS
            }
            getDownstreamStages={
              currentDraft.executionMode === 'normal' ? getBatchDraftDownstreamStages : getReprocessingDownstreamStages
            }
            getDefaultPipelineConfig={
              currentDraft.executionMode === 'normal'
                ? getDefaultBatchDraftPipelineConfig
                : getDefaultReprocessingPipelineConfig
            }
            getRequestedStages={
              currentDraft.executionMode === 'normal'
                ? batchDraftPipelineConfigToRequestedStages
                : pipelineConfigToReprocessingRequestedStages
            }
            showNormalizationPasses
          />
          {currentDraft.documents.length > 0 ? (
            <ReprocessingDraftDocumentsTable
              documents={currentDraft.documents}
              disabled={isPending}
              onRemove={removeDocument}
            />
          ) : null}
          {selectedFolderList.length > 0 ? <ProcessSelectedFoldersPanel folders={selectedFolderList} /> : null}
          {selectedFolders && onToggleFolderSelection && onToggleFolderExpansion ? (
            <GoogleDriveFolderTree
              rootFolders={rootFolders}
              childFoldersByParent={childFoldersByParent}
              expandedFolderIds={expandedFolderIds}
              selectedFolderIds={selectedFolders}
              error={foldersError}
              expanded={googleDriveExpanded}
              onExpandedChange={(expanded) => {
                setGoogleDriveExpanded(expanded)
                onGoogleDriveExpandedChange?.(expanded)
              }}
              onToggleFolderSelection={onToggleFolderSelection}
              onToggleFolderExpansion={onToggleFolderExpansion}
            />
          ) : null}
          {!hasSources ? (
            <Alert severity={'warning'}>
              {'Add at least one source folder or document before submitting this draft.'}
            </Alert>
          ) : null}
          <ReprocessingDraftSubmissionSummary
            documentCount={currentDraft.documents.length}
            sourceFolderCount={currentSourceFolderIds.length}
            restartStage={currentDraft.restartStage}
            requestedStages={currentDraft.requestedStages}
            collectionName={currentDraft.collectionName}
            collectionNotes={currentDraft.collectionNotes}
            reason={currentDraft.reason}
          />
          {message ? <Alert severity={'success'}>{message}</Alert> : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button onClick={submitDraft} disabled={!canSubmit} loading={isPending}>
              {SUBMIT_LABEL}
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

export const ReprocessingDraftWorkspace = BatchDraftWorkspace
