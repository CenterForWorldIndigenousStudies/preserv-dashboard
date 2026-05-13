'use client'

import { useEffect, useMemo, useState, useTransition, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Stack } from '@mui/material'

import { PROCESS_EVENTS_PATH, PROCESS_FOLDERS_PATH, PROCESS_START_PATH } from '@constants/paths'
import { DOCUMENT_SPLITTER_STAGE, OCR_PROCESSOR_STAGE, PAGE_ROTATOR_STAGE } from '@constants/pipeline'
import type { DriveFolderOption } from '@lib/googleDrive'
import type { ProcessBatchStatus } from '@lib/processBatches'
import { GoogleDriveFolderTree } from '@molecules/GoogleDriveFolderTree'
import { PipelineStageSelectorPanel } from '@molecules/PipelineStageSelectorPanel'
import { ProcessBatchFormPanel } from '@molecules/ProcessBatchFormPanel'
import { ProcessBatchStatusCard } from '@molecules/ProcessBatchStatusCard'
import { ProcessSelectedFoldersPanel } from '@molecules/ProcessSelectedFoldersPanel'

interface ProcessDocumentsManagerProps {
  initialBatches: ProcessBatchStatus[]
}

interface ProcessAcceptedResponse {
  batch_id: string
  batch_name: string
}

function isStageTerminal(status: string | null | undefined): boolean {
  return status === 'completed' || status === 'failed' || status === 'review_needed'
}

function isStageFullyTerminal(stage: ProcessBatchStatus['ingester']): boolean {
  if (!stage || !isStageTerminal(stage.status)) {
    return false
  }

  if (stage.status !== 'completed') {
    return true
  }

  return stage.completedPasses.length >= stage.maxPasses
}

function isProcessTerminal(batch: ProcessBatchStatus): boolean {
  if (!isStageFullyTerminal(batch.ingester)) {
    return false
  }

  if (batch.ingester?.status === 'failed') {
    return true
  }

  if (batch.pipelineRequestedStages.length === 0) {
    return true
  }

  if (
    batch.pipelineRequestedStages.includes(DOCUMENT_SPLITTER_STAGE) &&
    (batch.documentSplitter?.status === 'failed' || batch.documentSplitter?.status === 'review_needed')
  ) {
    return true
  }

  if (
    batch.pipelineRequestedStages.includes(PAGE_ROTATOR_STAGE) &&
    (batch.pageRotator?.status === 'failed' || batch.pageRotator?.status === 'review_needed')
  ) {
    return true
  }

  if (
    batch.pipelineRequestedStages.includes(OCR_PROCESSOR_STAGE) &&
    (batch.ocrProcessor?.status === 'failed' || batch.ocrProcessor?.status === 'review_needed')
  ) {
    return true
  }

  return batch.pipelineRequestedStages.every((stage) => {
    if (stage === DOCUMENT_SPLITTER_STAGE) {
      return isStageFullyTerminal(batch.documentSplitter)
    }
    if (stage === PAGE_ROTATOR_STAGE) {
      return isStageFullyTerminal(batch.pageRotator)
    }
    if (stage === OCR_PROCESSOR_STAGE) {
      return isStageFullyTerminal(batch.ocrProcessor)
    }

    return false
  })
}

function upsertBatchStatus(
  batches: ProcessBatchStatus[],
  nextBatch: ProcessBatchStatus,
): ProcessBatchStatus[] {
  const withoutExisting = batches.filter((batch) => batch.batchId !== nextBatch.batchId)
  return [nextBatch, ...withoutExisting].slice(0, 25)
}

export function ProcessDocumentsManager({
  initialBatches,
}: ProcessDocumentsManagerProps): ReactElement {
  const router = useRouter()
  const [isSubmitting, startSubmitTransition] = useTransition()
  const [isRefreshing, startRefreshTransition] = useTransition()
  const [batchName, setBatchName] = useState('')
  const [collectionName, setCollectionName] = useState('')
  const [collectionNotes, setCollectionNotes] = useState('')
  const [requestedStages, setRequestedStages] = useState<string[]>([])
  const [recentBatches, setRecentBatches] = useState(initialBatches)
  const [rootFolders, setRootFolders] = useState<DriveFolderOption[]>([])
  const [childFoldersByParent, setChildFoldersByParent] = useState<Record<string, DriveFolderOption[]>>({})
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({})
  const [selectedFolders, setSelectedFolders] = useState<Record<string, DriveFolderOption>>({})
  const [foldersError, setFoldersError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [acceptedResult, setAcceptedResult] = useState<ProcessAcceptedResponse | null>(null)
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null)

  useEffect(() => {
    setRecentBatches(initialBatches)
  }, [initialBatches])

  useEffect(() => {
    void (async () => {
      try {
        setFoldersError(null)
        const response = await fetch(`${PROCESS_FOLDERS_PATH}`, { cache: 'no-store' })
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

  useEffect(() => {
    if (!activeBatchId) {
      return undefined
    }

    const eventSource = new EventSource(`${PROCESS_EVENTS_PATH}?batchId=${encodeURIComponent(activeBatchId)}`)

    eventSource.addEventListener('batch_status', (event) => {
      const message = event as MessageEvent<string>
      const batch = JSON.parse(message.data) as ProcessBatchStatus
      setRecentBatches((current) => upsertBatchStatus(current, batch))

      if (isProcessTerminal(batch)) {
        setActiveBatchId((current) => (current === batch.batchId ? null : current))
        eventSource.close()
      }
    })

    eventSource.addEventListener('batch_missing', () => {
      setSubmitError('Live updates stopped because the batch could not be found.')
      setActiveBatchId(null)
      eventSource.close()
    })

    eventSource.onerror = () => {
      setSubmitError('Live updates disconnected. Use Refresh Status to reload the latest batch state.')
      setActiveBatchId(null)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [activeBatchId])

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

  function refreshStatuses(): void {
    startRefreshTransition(() => {
      router.refresh()
    })
  }

  function submitProcess(): void {
    startSubmitTransition(() => {
      void (async () => {
        setSubmitError(null)
        setAcceptedResult(null)

        const selectedFolderIds = Object.keys(selectedFolders)
        const response = await fetch(PROCESS_START_PATH, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            batchName,
            sourceFolderIds: selectedFolderIds,
            collectionName,
            collectionNotes,
            requestedStages,
          }),
        })
        const payload = (await response.json()) as {
          error?: string
          batch_id?: string
          batch_name?: string
        }
        if (!response.ok) {
          setSubmitError(payload.error ?? 'Failed to start processing.')
          return
        }

        const submittedAt = new Date().toISOString()
        const submittedBatchId = payload.batch_id ?? ''
        const submittedBatchName = payload.batch_name ?? batchName

        setAcceptedResult({
          batch_id: submittedBatchId,
          batch_name: submittedBatchName,
        })
        setRecentBatches((current) =>
          upsertBatchStatus(current, {
            batchId: submittedBatchId,
            batchName: submittedBatchName,
            startedBy: 'Current user',
            createdAt: submittedAt,
            pipelineRequestedStages: requestedStages,
            ingester: {
              status: 'accepted',
              requestId: null,
              requestedByApp: 'preserv-dashboard',
              initiatedAt: submittedAt,
              startedAt: null,
              completedAt: null,
              lastTransitionAt: submittedAt,
              error: null,
              callbackDeliveryStatus: null,
              callbackNotifiedAt: null,
              callbackReceivedAt: null,
              callbackHttpStatus: null,
              callbackErrorType: null,
              callbackErrorMessage: null,
              processedCount: 0,
              ingestedCount: 0,
              duplicateCount: 0,
              skippedSameOriginCount: 0,
              splitCount: 0,
              childCount: 0,
              passedThroughCount: 0,
              rotatedCount: 0,
              normalizedCount: 0,
              ocrCompletedCount: 0,
              skippedCount: 0,
              reviewNeededCount: 0,
              failedCount: 0,
              currentPass: 1,
              maxPasses: 1,
              completedPasses: [],
              sourceFolderIds: selectedFolderIds,
              collectionName: collectionName.trim() || null,
              collectionNotes: collectionNotes.trim() || null,
            },
            documentSplitter: null,
            pageRotator: null,
            ocrProcessor: null,
          }),
        )
        setActiveBatchId(submittedBatchId)
        setBatchName('')
        setCollectionName('')
        setCollectionNotes('')
        setRequestedStages([])
        setSelectedFolders({})
      })().catch((error: unknown) => {
        setSubmitError(error instanceof Error ? error.message : 'Failed to start processing.')
      })
    })
  }

  const selectedFolderList = useMemo(() => Object.values(selectedFolders), [selectedFolders])
  const canSubmit = batchName.trim().length > 0 && selectedFolderList.length > 0 && !isSubmitting

  return (
    <Stack spacing={4}>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
          },
        }}
      >
        <ProcessBatchFormPanel
          batchName={batchName}
          collectionName={collectionName}
          collectionNotes={collectionNotes}
          isSubmitting={isSubmitting}
          isRefreshing={isRefreshing}
          canSubmit={canSubmit}
          submitError={submitError}
          acceptedBatchName={acceptedResult?.batch_name ?? null}
          onBatchNameChange={setBatchName}
          onCollectionNameChange={setCollectionName}
          onCollectionNotesChange={setCollectionNotes}
          onSubmit={submitProcess}
          onRefresh={refreshStatuses}
        />
        <Stack spacing={3}>
          <PipelineStageSelectorPanel
            selectedStages={requestedStages}
            onSelectedStagesChange={setRequestedStages}
          />
          <ProcessSelectedFoldersPanel folders={selectedFolderList} />
        </Stack>
      </Box>

      <GoogleDriveFolderTree
        rootFolders={rootFolders}
        childFoldersByParent={childFoldersByParent}
        expandedFolderIds={expandedFolderIds}
        selectedFolderIds={selectedFolders}
        error={foldersError}
        onToggleFolderSelection={toggleFolderSelection}
        onToggleFolderExpansion={toggleFolderExpansion}
      />

      <Stack spacing={3}>
        {recentBatches.map((batch) => (
          <ProcessBatchStatusCard key={batch.batchId} batch={batch} />
        ))}
      </Stack>
    </Stack>
  )
}
