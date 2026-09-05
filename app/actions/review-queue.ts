'use server'

import { revalidatePath } from 'next/cache'
import {
  applyReviewQueueDecision,
  getNeedsReviewDocuments,
  getReviewQueueDocuments,
  updateReviewQueueChecklist,
  type DocumentsQueryParams,
  type ReviewQueueChecklistUpdateParams,
} from '@lib/queries/queries'
import type { ReviewQueueDecision, ReviewQueueDocumentsQueryParams } from 'types/reviewQueue'
import type { ReviewQueueChecklistItemKey, ReviewQueueChecklistState } from '@constants/reviewQueueChecklist'
import { getDashboardSession } from '@root/auth'
import { LIBRARY_PATH, READY_FOR_LIBRARY_PATH, REVIEW_QUEUE_PATH } from '@constants/paths'

interface ReviewQueueBatchApproveFailure {
  documentId: string
  error: string
}

export type ReviewQueueBatchApproveActionResult =
  | {
      ok: true
      approvedIds: string[]
      failed: ReviewQueueBatchApproveFailure[]
      message: string
    }
  | {
      ok: false
      approvedIds: string[]
      failed: ReviewQueueBatchApproveFailure[]
      error: string
    }

export type ReviewQueueBatchDecisionActionResult =
  | {
      ok: true
      processedIds: string[]
      failed: ReviewQueueBatchApproveFailure[]
      message: string
    }
  | {
      ok: false
      processedIds: string[]
      failed: ReviewQueueBatchApproveFailure[]
      error: string
    }

export async function getReviewQueueAction(params: ReviewQueueDocumentsQueryParams = {}) {
  return getReviewQueueDocuments(params)
}

export async function getNeedsReviewDocumentsAction(params: DocumentsQueryParams = {}) {
  return getNeedsReviewDocuments(params)
}

export async function updateReviewQueueChecklistAction(
  documentId: string,
  itemKey: ReviewQueueChecklistItemKey,
  completed: boolean,
): Promise<{ ok: true; checklist: ReviewQueueChecklistState } | { ok: false; error: string }> {
  const trimmedDocumentId = documentId.trim()
  if (!trimmedDocumentId) {
    return { ok: false, error: 'Document ID is required.' }
  }

  try {
    const params: ReviewQueueChecklistUpdateParams = {
      documentId: trimmedDocumentId,
      itemKey,
      completed,
    }
    const checklist = await updateReviewQueueChecklist(params)
    revalidatePath(REVIEW_QUEUE_PATH)
    return { ok: true, checklist }
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The review checklist could not be saved.',
    }
  }
}

export async function applyReviewQueueDecisionAction(
  documentId: string,
  decision: ReviewQueueDecision,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const trimmedDocumentId = documentId.trim()
  if (!trimmedDocumentId) {
    return { ok: false, error: 'Document ID is required.' }
  }

  const session = await getDashboardSession()
  const validatorName = session?.user?.name?.trim() || null

  try {
    await applyReviewQueueDecision({
      documentId: trimmedDocumentId,
      decision,
      validationTimestamp: Math.floor(Date.now() / 1000),
      validatorName,
    })
    revalidatePath(REVIEW_QUEUE_PATH)
    revalidatePath(READY_FOR_LIBRARY_PATH)
    revalidatePath(LIBRARY_PATH)

    return {
      ok: true,
      message: decision === 'APPROVED' ? 'Document approved.' : 'Document rejected.',
    }
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The review decision could not be saved.',
    }
  }
}

export async function applyReviewQueueBatchApproveAction(
  documentIds: string[],
): Promise<ReviewQueueBatchApproveActionResult> {
  const result = await applyReviewQueueBatchDecisionAction(documentIds, 'APPROVED')
  if (result.ok) {
    return {
      ok: true,
      approvedIds: result.processedIds,
      failed: result.failed,
      message: result.message,
    }
  }

  return {
    ok: false,
    approvedIds: result.processedIds,
    failed: result.failed,
    error: result.error,
  }
}

export async function applyReviewQueueBatchDecisionAction(
  documentIds: string[],
  decision: ReviewQueueDecision,
): Promise<ReviewQueueBatchDecisionActionResult> {
  const normalizedDocumentIds = [...new Set(documentIds.map((documentId) => documentId.trim()).filter(Boolean))]

  if (normalizedDocumentIds.length === 0) {
    return {
      ok: false,
      processedIds: [],
      failed: [],
      error: `Select at least one document to ${decision === 'APPROVED' ? 'approve' : 'reject'}.`,
    }
  }

  const results = await Promise.all(
    normalizedDocumentIds.map(async (documentId) => ({
      documentId,
      result: await applyReviewQueueDecisionAction(documentId, decision),
    })),
  )

  const processedIds = results.filter((entry) => entry.result.ok).map((entry) => entry.documentId)
  const failed = results.flatMap<ReviewQueueBatchApproveFailure>((entry) =>
    entry.result.ok ? [] : [{ documentId: entry.documentId, error: entry.result.error }],
  )

  const verb = decision === 'APPROVED' ? 'approved' : 'rejected'
  if (processedIds.length === 0) {
    return {
      ok: false,
      processedIds: [],
      failed,
      error:
        failed.length === 1
          ? (failed[0]?.error ?? `No selected documents could be ${verb}.`)
          : `No selected documents could be ${verb}.`,
    }
  }

  if (failed.length > 0) {
    return {
      ok: true,
      processedIds,
      failed,
      message: `${processedIds.length} documents ${verb}. ${failed.length} failed.`,
    }
  }

  return {
    ok: true,
    processedIds,
    failed: [],
    message: `${processedIds.length} documents ${verb}.`,
  }
}
