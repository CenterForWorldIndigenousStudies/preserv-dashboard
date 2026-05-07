'use client'

import { useEffect, useMemo, useState, useTransition, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Paper, Stack, Typography } from '@mui/material'

import type { DriveFolderOption } from '@lib/googleDrive'
import type { IngestBatchStatus } from '@lib/ingestBatches'
import { IngestBatchFormPanel } from '@molecules/IngestBatchFormPanel'
import { IngestBatchStatusCard } from '@molecules/IngestBatchStatusCard'
import { GoogleDriveFolderTree } from '@molecules/GoogleDriveFolderTree'
import { IngestSelectedFoldersPanel } from '@molecules/IngestSelectedFoldersPanel'

interface IngestDocumentsManagerProps {
  initialBatches: IngestBatchStatus[]
}

interface IngestAcceptedResponse {
  batch_id: string
  batch_name: string
}

function isTerminalStatus(status: string | null): boolean {
  return status === 'completed' || status === 'failed'
}

function upsertBatchStatus(
  batches: IngestBatchStatus[],
  nextBatch: IngestBatchStatus,
): IngestBatchStatus[] {
  const withoutExisting = batches.filter((batch) => batch.batchId !== nextBatch.batchId)
  return [nextBatch, ...withoutExisting].slice(0, 25)
}

export function IngestDocumentsManager({
  initialBatches,
}: IngestDocumentsManagerProps): ReactElement {
  const router = useRouter()
  const [isSubmitting, startSubmitTransition] = useTransition()
  const [isRefreshing, startRefreshTransition] = useTransition()
  const [batchName, setBatchName] = useState('')
  const [collectionName, setCollectionName] = useState('')
  const [collectionNotes, setCollectionNotes] = useState('')
  const [recentBatches, setRecentBatches] = useState(initialBatches)
  const [rootFolders, setRootFolders] = useState<DriveFolderOption[]>([])
  const [childFoldersByParent, setChildFoldersByParent] = useState<Record<string, DriveFolderOption[]>>({})
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({})
  const [selectedFolders, setSelectedFolders] = useState<Record<string, DriveFolderOption>>({})
  const [foldersError, setFoldersError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [acceptedResult, setAcceptedResult] = useState<IngestAcceptedResponse | null>(null)
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null)

  useEffect(() => {
    setRecentBatches(initialBatches)
  }, [initialBatches])

  useEffect(() => {
    void (async () => {
      try {
        setFoldersError(null)
        const response = await fetch('/api/ingest/folders', { cache: 'no-store' })
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

    const eventSource = new EventSource(`/api/ingest/events?batchId=${encodeURIComponent(activeBatchId)}`)

    eventSource.addEventListener('batch_status', (event) => {
      const message = event as MessageEvent<string>
      const batch = JSON.parse(message.data) as IngestBatchStatus
      setRecentBatches((current) => upsertBatchStatus(current, batch))

      if (isTerminalStatus(batch.status)) {
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

    const response = await fetch(`/api/ingest/folders?parentId=${encodeURIComponent(parentId)}`, {
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

  function submitIngest(): void {
    startSubmitTransition(() => {
      void (async () => {
        setSubmitError(null)
        setAcceptedResult(null)

        const selectedFolderIds = Object.keys(selectedFolders)
        const response = await fetch('/api/ingest/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            batchName,
            sourceFolderIds: selectedFolderIds,
            collectionName,
            collectionNotes,
          }),
        })
        const payload = (await response.json()) as {
          error?: string
          batch_id?: string
          batch_name?: string
        }
        if (!response.ok) {
          setSubmitError(payload.error ?? 'Failed to start ingest.')
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
            requestId: null,
            startedBy: 'Current user',
            createdAt: submittedAt,
            startedAt: null,
            completedAt: null,
            lastTransitionAt: submittedAt,
            status: 'accepted',
            processedCount: 0,
            ingestedCount: 0,
            duplicateCount: 0,
            skippedSameOriginCount: 0,
            sourceFolderIds: selectedFolderIds,
            collectionName: collectionName.trim() || null,
            collectionNotes: collectionNotes.trim() || null,
            error: null,
            callbackDeliveryStatus: null,
            callbackNotifiedAt: null,
            callbackReceivedAt: null,
            callbackHttpStatus: null,
            callbackErrorType: null,
            callbackErrorMessage: null,
          }),
        )
        setActiveBatchId(submittedBatchId)
        setBatchName('')
        setCollectionName('')
        setCollectionNotes('')
        setSelectedFolders({})
      })().catch((error: unknown) => {
        setSubmitError(error instanceof Error ? error.message : 'Failed to start ingest.')
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
        <IngestBatchFormPanel
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
          onSubmit={submitIngest}
          onRefresh={refreshStatuses}
        />
        <IngestSelectedFoldersPanel folders={selectedFolderList} />
      </Box>

      <GoogleDriveFolderTree
        title="Browse Google Drive folders"
        description="Select one or more source folders for the next ingest batch."
        rootFolders={rootFolders}
        childFoldersByParent={childFoldersByParent}
        expandedFolderIds={expandedFolderIds}
        selectedFolderIds={selectedFolders}
        error={foldersError}
        onToggleFolderSelection={toggleFolderSelection}
        onToggleFolderExpansion={toggleFolderExpansion}
      />

      <section>
        <Stack spacing={2}>
          <div>
            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.16em' }}>
              Recent Ingests
            </Typography>
            <Typography variant="h5" sx={{ mt: 1 }}>
              Current and recent ingest batches
            </Typography>
          </div>

          {recentBatches.length === 0 ? (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, p: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No ingest batches have been created yet.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {recentBatches.map((batch) => (
                <IngestBatchStatusCard key={batch.batchId} batch={batch} />
              ))}
            </Stack>
          )}
        </Stack>
      </section>
    </Stack>
  )
}
