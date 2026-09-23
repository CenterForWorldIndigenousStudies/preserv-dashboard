'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'

import { BATCHES_PATH, PROCESS_DOCUMENTS_PATH, PROCESS_FOLDERS_PATH } from '@constants/paths'
import { DATA_INGESTER_SERVICE } from '@constants/pipeline'
import type { DriveFolderOption } from '@lib/googleDrive'
import { useBatchSearch } from '@lib/hooks/useBatchSearch'
import type { PipelineConfig } from '@lib/pipelineConfig'
import { BatchDraftForm } from '@molecules/BatchDraftForm'
import { AccordionPanel } from '@molecules/AccordionPanel'
import { BatchCart } from '@molecules/BatchCart'
import { ConfirmationDialog } from '@molecules/ConfirmationDialog'
import { GoogleDriveFolderTree } from '@molecules/GoogleDriveFolderTree'
import { ProcessSelectedFoldersPanel } from '@molecules/ProcessSelectedFoldersPanel'
import {
  BATCH_DRAFT_STAGE_OPTIONS,
  batchDraftPipelineConfigToRequestedStages,
  getBatchDraftDownstreamStages,
  getBatchDraftInitialConfig,
  getDefaultBatchDraftPipelineConfig,
} from '@lib/batchDraftPipeline'
import { ProcessBatchMonitor } from '@organisms/ProcessBatchMonitor'
import type { CallbackStageKey, ProcessBatchStatus } from 'types/pipelineContracts'
import type { BatchDraftSummary } from 'types/batchDrafts'
import type { ReprocessingDraftDetail } from 'types/reprocessingDrafts'
import { BatchDraftWorkspace } from '@organisms/BatchDraftWorkspace'

export const UNSAVED_NEW_BATCH_CHANGES_MESSAGE = 'Your unsaved new batch changes will be lost.'

interface ProcessDocumentsWorkspaceProps {
  initialBatches: ProcessBatchStatus[]
  initialDrafts: readonly BatchDraftSummary[]
  initialDraft?: ReprocessingDraftDetail | null
}

type WorkspaceMode = 'create' | 'draft'

// This workspace coordinates create, manage, navigation, and monitoring states.
// eslint-disable-next-line complexity -- The component owns the process workspace transitions.
export function ProcessDocumentsWorkspace({
  initialBatches,
  initialDrafts,
  initialDraft = null,
}: ProcessDocumentsWorkspaceProps): ReactElement {
  const router = useRouter()
  const [isSubmitting, startSubmitTransition] = useTransition()
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialDraft ? 'draft' : 'create')
  const [batchName, setBatchName] = useState('')
  const [collectionName, setCollectionName] = useState('')
  const [collectionNotes, setCollectionNotes] = useState('')
  const [reason, setReason] = useState('Initial preservation batch')
  const [startStage, setStartStage] = useState<CallbackStageKey>(DATA_INGESTER_SERVICE)
  const [pipelineConfig, setPipelineConfig] = useState<PipelineConfig>(getBatchDraftInitialConfig)
  const [recentBatches, setRecentBatches] = useState(initialBatches)
  const [rootFolders, setRootFolders] = useState<DriveFolderOption[]>([])
  const [childFoldersByParent, setChildFoldersByParent] = useState<Record<string, DriveFolderOption[]>>({})
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({})
  const [selectedFolders, setSelectedFolders] = useState<Record<string, DriveFolderOption>>({})
  const [isGoogleDriveExpanded, setIsGoogleDriveExpanded] = useState(true)
  const [isCreateBatchExpanded, setIsCreateBatchExpanded] = useState(!initialDraft)
  const [foldersError, setFoldersError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pendingDraftId, setPendingDraftId] = useState<string | null>(null)
  const batchSearch = useBatchSearch(batchName, { enabled: true, limit: 7 })

  useEffect(() => {
    setRecentBatches(initialBatches)
  }, [initialBatches])

  useEffect(() => {
    setWorkspaceMode(initialDraft ? 'draft' : 'create')
  }, [initialDraft?.id])

  useEffect(() => {
    if (!initialDraft) return
    setSelectedFolders(
      Object.fromEntries(
        (initialDraft.sourceFolderIds ?? []).map((folderId) => [folderId, { id: folderId, name: folderId }]),
      ),
    )
  }, [initialDraft?.id])

  useEffect(() => {
    void (async () => {
      try {
        setFoldersError(null)
        const response = await fetch(PROCESS_FOLDERS_PATH, { cache: 'no-store' })
        const payload = (await response.json()) as { folders?: DriveFolderOption[]; error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to load folders.')
        }
        setRootFolders(payload.folders ?? [])
      } catch (error: unknown) {
        setFoldersError(error instanceof Error ? error.message : 'Failed to load folders.')
      }
    })()
  }, [])

  const selectedFolderList = useMemo(() => Object.values(selectedFolders), [selectedFolders])
  const batchNameExists = Boolean(batchName.trim()) && batchSearch.exactMatch !== null
  const canSubmit = batchName.trim().length > 0 && selectedFolderList.length > 0 && !isSubmitting && !batchNameExists
  const hasNewBatchChanges =
    batchName.length > 0 ||
    collectionName.length > 0 ||
    collectionNotes.length > 0 ||
    reason !== 'Initial preservation batch' ||
    startStage !== DATA_INGESTER_SERVICE ||
    JSON.stringify(pipelineConfig) !== JSON.stringify(getBatchDraftInitialConfig()) ||
    selectedFolderList.length > 0

  function resetNewBatchForm(): void {
    setBatchName('')
    setCollectionName('')
    setCollectionNotes('')
    setReason('Initial preservation batch')
    setStartStage(DATA_INGESTER_SERVICE)
    setPipelineConfig(getBatchDraftInitialConfig())
    setSelectedFolders({})
    setExpandedFolderIds({})
    setSubmitError(null)
    setIsCreateBatchExpanded(true)
    setIsGoogleDriveExpanded(true)
  }

  function startNewBatch(): void {
    resetNewBatchForm()
    setWorkspaceMode('create')
  }

  function manageDraft(draftId: string): void {
    if (workspaceMode === 'create' && hasNewBatchChanges) {
      setPendingDraftId(draftId)
      return
    }

    navigateToDraft(draftId)
  }

  function navigateToDraft(draftId: string): void {
    setPendingDraftId(null)
    if (initialDraft?.id === draftId) {
      setWorkspaceMode('draft')
      setSelectedFolders(
        Object.fromEntries(
          (initialDraft.sourceFolderIds ?? []).map((folderId) => [folderId, { id: folderId, name: folderId }]),
        ),
      )
      return
    }
    router.push(`${PROCESS_DOCUMENTS_PATH}?draftId=${encodeURIComponent(draftId)}`)
  }

  async function loadChildFolders(parentId: string): Promise<void> {
    if (childFoldersByParent[parentId]) {
      return
    }

    const response = await fetch(`${PROCESS_FOLDERS_PATH}?parentId=${encodeURIComponent(parentId)}`, {
      cache: 'no-store',
    })
    const payload = (await response.json()) as { folders?: DriveFolderOption[]; error?: string }
    if (!response.ok) {
      throw new Error(payload.error ?? 'Failed to load child folders.')
    }

    setChildFoldersByParent((current) => ({
      ...current,
      [parentId]: payload.folders ?? [],
    }))
  }

  function toggleFolderSelection(folder: DriveFolderOption): void {
    setSelectedFolders((current) => {
      if (current[folder.id]) {
        const next = { ...current }
        delete next[folder.id]
        return next
      }

      return {
        ...current,
        [folder.id]: folder,
      }
    })
  }

  function toggleFolderExpansion(folderId: string): void {
    setExpandedFolderIds((current) => ({
      ...current,
      [folderId]: !current[folderId],
    }))

    if (!expandedFolderIds[folderId]) {
      void loadChildFolders(folderId).catch((error: unknown) => {
        setFoldersError(error instanceof Error ? error.message : 'Failed to load child folders.')
      })
    }
  }

  function submitProcess(): void {
    startSubmitTransition(() => {
      void (async () => {
        setSubmitError(null)
        const selectedFolderIds = Object.keys(selectedFolders)
        const { createBatchDraftAction } = await import('@actions/batchDrafts')
        const result = await createBatchDraftAction({
          sourceFolderIds: selectedFolderIds,
          name: batchName,
          collectionName,
          collectionNotes,
          restartStage: startStage,
          requestedStages: batchDraftPipelineConfigToRequestedStages(pipelineConfig),
          executionMode: 'normal',
          pipelineConfig: { ...pipelineConfig, sourceFolderIds: selectedFolderIds, sourceDocumentIds: [] },
          reason,
        })
        if (!result.ok) {
          setSubmitError(result.error)
          return
        }
        router.push(`${PROCESS_DOCUMENTS_PATH}?draftId=${encodeURIComponent(result.batchId)}`)
      })().catch((error: unknown) => {
        setSubmitError(error instanceof Error ? error.message : 'Failed to create batch draft.')
      })
    })
  }

  return (
    <Stack spacing={4}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        {workspaceMode === 'draft' && initialDraft ? (
          <Button
            variant={'outlined'}
            onClick={startNewBatch}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {'Create New Batch'}
          </Button>
        ) : (
          <Box />
        )}
        <BatchCart drafts={initialDrafts} onManageDraft={manageDraft} />
      </Box>
      {workspaceMode === 'draft' && initialDraft ? (
        <BatchDraftWorkspace
          initialDraft={initialDraft}
          rootFolders={rootFolders}
          childFoldersByParent={childFoldersByParent}
          expandedFolderIds={expandedFolderIds}
          selectedFolders={selectedFolders}
          foldersError={foldersError}
          onToggleFolderSelection={toggleFolderSelection}
          onToggleFolderExpansion={toggleFolderExpansion}
          onGoogleDriveExpandedChange={setIsGoogleDriveExpanded}
        />
      ) : null}
      {workspaceMode === 'create' ? (
        <AccordionPanel
          expanded={isCreateBatchExpanded}
          onChange={(_, expanded) => setIsCreateBatchExpanded(expanded)}
          summary={
            <Typography component={'span'} variant={'h5'}>
              {'Create a new batch'}
            </Typography>
          }
        >
          <Stack spacing={4}>
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.15fr) minmax(0, 0.85fr)' },
              }}
            >
              <BatchDraftForm
                name={batchName}
                collectionName={collectionName}
                collectionNotes={collectionNotes}
                startStage={startStage}
                requestedStages={batchDraftPipelineConfigToRequestedStages(pipelineConfig)}
                pipelineConfig={pipelineConfig}
                stageOptions={BATCH_DRAFT_STAGE_OPTIONS}
                getDownstreamStages={getBatchDraftDownstreamStages}
                getDefaultPipelineConfig={getDefaultBatchDraftPipelineConfig}
                getRequestedStages={batchDraftPipelineConfigToRequestedStages}
                reason={reason}
                isSubmitting={isSubmitting}
                canSubmit={canSubmit && reason.trim().length > 0}
                error={submitError}
                nameExists={batchNameExists}
                batchNameSearchError={batchSearch.error}
                onNameChange={setBatchName}
                onCollectionNameChange={setCollectionName}
                onCollectionNotesChange={setCollectionNotes}
                onStartStageChange={setStartStage}
                onRequestedStagesChange={() => undefined}
                onPipelineConfigChange={setPipelineConfig}
                onReasonChange={setReason}
                onSubmit={submitProcess}
              />
              <ProcessSelectedFoldersPanel folders={selectedFolderList} />
            </Box>
            <GoogleDriveFolderTree
              rootFolders={rootFolders}
              childFoldersByParent={childFoldersByParent}
              expandedFolderIds={expandedFolderIds}
              selectedFolderIds={selectedFolders}
              error={foldersError}
              expanded={isGoogleDriveExpanded}
              onExpandedChange={setIsGoogleDriveExpanded}
              onToggleFolderSelection={toggleFolderSelection}
              onToggleFolderExpansion={toggleFolderExpansion}
            />
          </Stack>
        </AccordionPanel>
      ) : null}
      <ConfirmationDialog
        open={pendingDraftId !== null}
        title={'Discard new batch changes?'}
        message={UNSAVED_NEW_BATCH_CHANGES_MESSAGE}
        confirmLabel={'Discard and manage'}
        cancelLabel={'Cancel'}
        onConfirm={() => {
          if (pendingDraftId) {
            navigateToDraft(pendingDraftId)
          }
        }}
        onCancel={() => setPendingDraftId(null)}
      />
      <Card
        component={'section'}
        sx={(theme) => ({ p: 3, borderRadius: 2, border: 1, borderColor: theme.palette.divider, boxShadow: 2 })}
      >
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'flex-start' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ maxWidth: '42rem' }}>
              <Typography variant={'overline'} sx={{ color: 'primary.main', fontWeight: 600, letterSpacing: '0.18em' }}>
                {'Recent Launch Activity'}
              </Typography>
              <Typography component={'h2'} variant={'h6'} sx={{ mt: 1.5, fontWeight: 600, color: 'text.primary' }}>
                {'Keep early batch feedback nearby, then hand off to Batches.'}
              </Typography>
              <Typography sx={{ mt: 1.5, fontSize: '0.875rem', lineHeight: 1.6, color: 'text.secondary' }}>
                {
                  'These recent status cards help confirm that a launch was accepted and show the first operational signals. Use Batches as the primary workspace for routine monitoring and deeper investigation.'
                }
              </Typography>
            </Box>
            <Button
              component={Link}
              href={BATCHES_PATH}
              variant={'outlined'}
              sx={{
                borderRadius: 999,
                px: 2,
                py: 1,
                fontSize: '0.875rem',
                fontWeight: 500,
                textTransform: 'none',
                whiteSpace: 'nowrap',
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  color: 'text.primary',
                },
              }}
            >
              {'Continue to Batches'}
            </Button>
          </Box>

          <Box sx={{ mt: 3 }}>
            <ProcessBatchMonitor batches={recentBatches} onRollbackRequested={() => router.refresh()} />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  )
}
