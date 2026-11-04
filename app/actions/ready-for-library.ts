'use server'

import { revalidatePath } from 'next/cache'

import { READY_FOR_LIBRARY_PATH } from '@constants/paths'
import { getDashboardSession } from '@root/auth'
import {
  getReadyForLibraryDocuments,
  type ReadyForLibraryQueryParams,
} from '@lib/queries/readyForLibraryQueries'
import { triggerDataIngesterReprocess } from '@lib/pipelineTriggers'
import { getPublicationDraftForRetry, getReadyForLibrarySelectionNames, publishReadyForLibraryDocuments } from '@lib/queries/readyForLibraryPublicationQueries'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

export async function getReadyForLibrarySelectionAction(documentIds: readonly string[]): Promise<Array<{ id: string; name: string }>> {
  const session = await getDashboardSession()
  if (!session?.user?.email?.trim()) throw new Error('Authentication required.')
  return getReadyForLibrarySelectionNames(documentIds)
}

export async function retryPublicationDraftAction(batchId: string): Promise<{ ok: true; batchId: string } | { ok: false; error: string; batchId?: string }> {
  const session = await getDashboardSession()
  const email = session?.user?.email?.trim()
  if (!email) return { ok: false, error: 'Authentication required.' }
  const draft = await getPublicationDraftForRetry(batchId)
  if (!draft) return { ok: false, error: 'This publication batch is no longer a queued-submission draft.' }
  if (draft.requestedBy !== email) return { ok: false, error: 'Only the original requester can retry this publication draft.' }
  return publishReadyForLibraryAction({
    documentIds: draft.documentIds,
    name: draft.name,
    operationId: draft.operationId,
  })
}

export async function publishReadyForLibraryAction(input: {
  documentIds: readonly string[]
  name: string
  operationId: string
}): Promise<{ ok: true; batchId: string } | { ok: false; error: string; batchId?: string }> {
  const session = await getDashboardSession()
  const startedBy = session?.user?.email?.trim()
  if (!startedBy) return { ok: false, error: 'Authentication required.' }

  const result = await publishReadyForLibraryDocuments({ ...input, startedBy })
  if (!result.ok) return result
  const sourceDocumentIds = [...new Set(input.documentIds.map((id) => id.trim()).filter(Boolean))].sort()
  const batch: ProcessBatchStatus = {
    batchId: result.batchId,
    batchName: input.name.trim(),
    startedBy,
    createdAt: null,
    pipelineRequestedStages: ['fedora_ingester'],
    pipelineConfig: null,
    ingester: null,
    documentSplitter: null,
    pageRotator: null,
    ocrProcessor: null,
    contentDedup: null,
    metadataExtractor: null,
    fedoraIngester: null,
  }
  try {
    await triggerDataIngesterReprocess(batch, {
      executionMode: 'reprocess',
      operationId: input.operationId,
      idempotencyKey: input.operationId,
      reason: 'Publish selected Ready for Library documents.',
      sourceDocumentIds,
      draftBatchId: result.batchId,
      requestedStages: ['fedora_ingester'],
    })
    revalidatePath(READY_FOR_LIBRARY_PATH)
    return { ok: true, batchId: result.batchId }
  } catch (error: unknown) {
    return {
      ok: false,
      batchId: result.batchId,
      error: error instanceof Error ? error.message : 'The publication batch could not be queued.',
    }
  }
}

export async function getReadyForLibraryAction(params: ReadyForLibraryQueryParams = {}) {
  return getReadyForLibraryDocuments(params)
}
