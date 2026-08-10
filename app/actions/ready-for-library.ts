'use server'

import { revalidatePath } from 'next/cache'

import { READY_FOR_LIBRARY_PATH } from '@constants/paths'
import { getDashboardSession } from '@root/auth'
import {
  getReadyForLibraryBatchIds,
  getReadyForLibraryDocuments,
  type DocumentsQueryParams,
} from '@lib/queries/queries'
import { getProcessBatchStatus } from '@lib/processBatches'
import { isPipelineBatchTerminal } from '@lib/pipelineExecution'
import { triggerFedoraIngester } from '@lib/pipelineTriggers'

interface ReadyForLibraryHandoffFailure {
  batchId: string
  error: string
}

export type ReadyForLibraryHandoffActionResult =
  | {
      ok: true
      eligibleDocumentCount: number
      queuedBatchCount: number
      skippedBatchCount: number
      failed: ReadyForLibraryHandoffFailure[]
      message: string
    }
  | {
      ok: false
      eligibleDocumentCount: number
      queuedBatchCount: number
      skippedBatchCount: number
      failed: ReadyForLibraryHandoffFailure[]
      error: string
    }

export async function getReadyForLibraryAction(params: DocumentsQueryParams = {}) {
  return getReadyForLibraryDocuments(params)
}

function isHandoffAlreadyStarted(batch: Awaited<ReturnType<typeof getProcessBatchStatus>>): boolean {
  if (!batch) {
    return false
  }

  if (batch.publicationStatus !== 'not_started') {
    return true
  }

  return ['queued', 'running', 'completed'].includes(batch.fedoraIngester?.status ?? '')
}

export async function triggerReadyForLibraryAction(): Promise<ReadyForLibraryHandoffActionResult> {
  const session = await getDashboardSession()
  const startedBy = session?.user?.email?.trim()
  if (!startedBy) {
    return {
      ok: false,
      eligibleDocumentCount: 0,
      queuedBatchCount: 0,
      skippedBatchCount: 0,
      failed: [],
      error: 'Authentication required.',
    }
  }

  const readyDocuments = await getReadyForLibraryDocuments()
  const batchIds = await getReadyForLibraryBatchIds(readyDocuments.items.map((item) => item.id))
  const queuedBatchIds: string[] = []
  const skippedBatchIds: string[] = []
  const failed: ReadyForLibraryHandoffFailure[] = []

  await Promise.all(
    batchIds.map(async (batchId) => {
      try {
        const batch = await getProcessBatchStatus(batchId)
        if (!batch) {
          failed.push({ batchId, error: `Batch ${batchId} was not found.` })
          return
        }

        if (isHandoffAlreadyStarted(batch)) {
          skippedBatchIds.push(batchId)
          return
        }

        if (!isPipelineBatchTerminal(batch)) {
          skippedBatchIds.push(batchId)
          return
        }

        await triggerFedoraIngester({ ...batch, startedBy })
        queuedBatchIds.push(batchId)
      } catch (error: unknown) {
        failed.push({
          batchId,
          error: error instanceof Error ? error.message : 'The library handoff could not be queued.',
        })
      }
    }),
  )

  revalidatePath(READY_FOR_LIBRARY_PATH)

  if (queuedBatchIds.length === 0 && skippedBatchIds.length === 0) {
    return {
      ok: false,
      eligibleDocumentCount: readyDocuments.items.length,
      queuedBatchCount: 0,
      skippedBatchCount: 0,
      failed,
      error:
        failed.length > 0
          ? 'No eligible batches could be queued for library handoff.'
          : 'No process batches are associated with the current Ready for Library documents.',
    }
  }

  const failedMessage = failed.length > 0 ? ` ${failed.length} batch${failed.length === 1 ? '' : 'es'} failed.` : ''
  const skippedMessage =
    skippedBatchIds.length > 0
      ? ` ${skippedBatchIds.length} batch${skippedBatchIds.length === 1 ? '' : 'es'} skipped because handoff was already started or processing is incomplete.`
      : ''
  return {
    ok: true,
    eligibleDocumentCount: readyDocuments.items.length,
    queuedBatchCount: queuedBatchIds.length,
    skippedBatchCount: skippedBatchIds.length,
    failed,
    message: `${queuedBatchIds.length} batch${queuedBatchIds.length === 1 ? '' : 'es'} queued for library handoff.${skippedMessage}${failedMessage}`,
  }
}
