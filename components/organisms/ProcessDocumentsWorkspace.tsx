'use client'

import { useEffect, useMemo, useState, useTransition, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Stack } from '@mui/material'

import { PROCESS_EVENTS_PATH, PROCESS_FOLDERS_PATH, PROCESS_START_PATH } from '@constants/paths'
import type { ProfileId } from '@constants/pipeline'
import type { DriveFolderOption } from '@lib/googleDrive'
import {
  buildAcceptedBatchStatus,
  getLiveBatchIds,
  normalizeAcceptedProcessStartResponse,
  upsertBatchStatus,
} from '@lib/processDocuments'
import {
  createDefaultDraft,
  draftToPipelineConfig,
  expandPresetToDraft,
  pipelineConfigToRequestedStages,
  type PipelineSelectionDraft,
} from '@lib/pipelineConfig'
import { ProcessBatchCreationWorkspace } from '@organisms/ProcessBatchCreationWorkspace'
import { ProcessBatchMonitor } from '@organisms/ProcessBatchMonitor'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

interface ProcessDocumentsWorkspaceProps {
  initialBatches: ProcessBatchStatus[]
}

interface ProcessAcceptedResponse {
  batchId?: string
  batchName?: string
  batch_id?: string
  batch_name?: string
  error?: string
}

export function ProcessDocumentsWorkspace({ initialBatches }: ProcessDocumentsWorkspaceProps): ReactElement {
  const router = useRouter()
  const [isSubmitting, startSubmitTransition] = useTransition()
  const [isRefreshing, startRefreshTransition] = useTransition()
  const [batchName, setBatchName] = useState('')
  const [collectionName, setCollectionName] = useState('')
  const [collectionNotes, setCollectionNotes] = useState('')
  const [pipelineDraft, setPipelineDraft] = useState<PipelineSelectionDraft>(createDefaultDraft)
  const [isPipelineStepsModalOpen, setIsPipelineStepsModalOpen] = useState(false)
  const [recentBatches, setRecentBatches] = useState(initialBatches)
  const [rootFolders, setRootFolders] = useState<DriveFolderOption[]>([])
  const [childFoldersByParent, setChildFoldersByParent] = useState<Record<string, DriveFolderOption[]>>({})
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({})
  const [selectedFolders, setSelectedFolders] = useState<Record<string, DriveFolderOption>>({})
  const [foldersError, setFoldersError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [acceptedResult, setAcceptedResult] = useState<{ batch_id: string; batch_name: string } | null>(null)

  useEffect(() => {
    setRecentBatches(initialBatches)
  }, [initialBatches])

  const liveBatchIds = useMemo(() => getLiveBatchIds(recentBatches), [recentBatches])
  const liveBatchIdsKey = liveBatchIds.join('|')

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

  useEffect(() => {
    const monitoredBatchIds = liveBatchIdsKey ? liveBatchIdsKey.split('|') : []

    if (monitoredBatchIds.length === 0) {
      return undefined
    }

    const eventSources = monitoredBatchIds.map((batchId) => {
      const eventSource = new EventSource(`${PROCESS_EVENTS_PATH}?batchId=${encodeURIComponent(batchId)}`)

      eventSource.addEventListener('batch_status', (event) => {
        const message = event as MessageEvent<string>
        const batch = JSON.parse(message.data) as ProcessBatchStatus
        setRecentBatches((current) => upsertBatchStatus(current, batch))
      })

      eventSource.addEventListener('batch_missing', () => {
        setSubmitError('Live updates stopped because the batch could not be found.')
        eventSource.close()
      })

      eventSource.onerror = () => {
        setSubmitError('Live updates disconnected. Use Refresh Status to reload the latest batch state.')
        eventSource.close()
      }

      return eventSource
    })

    return () => {
      for (const eventSource of eventSources) {
        eventSource.close()
      }
    }
  }, [liveBatchIdsKey])

  const selectedFolderList = useMemo(() => Object.values(selectedFolders), [selectedFolders])
  const canSubmit = batchName.trim().length > 0 && selectedFolderList.length > 0 && !isSubmitting

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

  function updatePipelineProfile(profileId: ProfileId): void {
    setPipelineDraft(expandPresetToDraft(profileId))
  }

  function submitProcess(): void {
    startSubmitTransition(() => {
      void (async () => {
        setSubmitError(null)
        setAcceptedResult(null)

        const selectedFolderIds = Object.keys(selectedFolders)
        const pipelineConfig = draftToPipelineConfig(pipelineDraft)
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
            pipelineConfig,
          }),
        })
        const payload = (await response.json()) as ProcessAcceptedResponse
        if (!response.ok) {
          setSubmitError(payload.error ?? 'Failed to start processing.')
          return
        }

        const submittedAt = new Date().toISOString()
        const { batchId: submittedBatchId, batchName: submittedBatchName } = normalizeAcceptedProcessStartResponse(
          payload as Record<string, unknown>,
          batchName,
        )
        if (!submittedBatchId) {
          setSubmitError('Process start response did not include a batch ID.')
          return
        }
        const requestedStages = pipelineConfigToRequestedStages(pipelineConfig)

        setAcceptedResult({
          batch_id: submittedBatchId,
          batch_name: submittedBatchName,
        })
        setRecentBatches((current) =>
          upsertBatchStatus(
            current,
            buildAcceptedBatchStatus({
              batchId: submittedBatchId,
              batchName: submittedBatchName,
              startedBy: 'Current user',
              submittedAt,
              selectedFolderIds,
              collectionName,
              collectionNotes,
              pipelineRequestedStages: requestedStages,
              pipelineConfig,
            }),
          ),
        )
        setBatchName('')
        setCollectionName('')
        setCollectionNotes('')
        setPipelineDraft(createDefaultDraft())
        setSelectedFolders({})
      })().catch((error: unknown) => {
        setSubmitError(error instanceof Error ? error.message : 'Failed to start processing.')
      })
    })
  }

  return (
    <Stack spacing={4}>
      <ProcessBatchCreationWorkspace
        batchName={batchName}
        collectionName={collectionName}
        collectionNotes={collectionNotes}
        isSubmitting={isSubmitting}
        isRefreshing={isRefreshing}
        canSubmit={canSubmit}
        submitError={submitError}
        acceptedBatchName={acceptedResult?.batch_name ?? null}
        pipelineDraft={pipelineDraft}
        isPipelineStepsModalOpen={isPipelineStepsModalOpen}
        rootFolders={rootFolders}
        childFoldersByParent={childFoldersByParent}
        expandedFolderIds={expandedFolderIds}
        selectedFolders={selectedFolders}
        foldersError={foldersError}
        onBatchNameChange={setBatchName}
        onCollectionNameChange={setCollectionName}
        onCollectionNotesChange={setCollectionNotes}
        onSubmit={submitProcess}
        onRefresh={refreshStatuses}
        onProfileChange={updatePipelineProfile}
        onConvertToCustom={() => {
          setPipelineDraft((current) => ({
            ...current,
            profileId: 'custom',
            mode: 'custom',
          }))
        }}
        onProfileDraftChange={setPipelineDraft}
        onOpenStepsModal={() => {
          setIsPipelineStepsModalOpen(true)
        }}
        onCloseStepsModal={() => {
          setIsPipelineStepsModalOpen(false)
        }}
        onToggleFolderSelection={toggleFolderSelection}
        onToggleFolderExpansion={toggleFolderExpansion}
      />

      <ProcessBatchMonitor batches={recentBatches} />
    </Stack>
  )
}
