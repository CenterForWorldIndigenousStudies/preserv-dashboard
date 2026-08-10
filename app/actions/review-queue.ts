'use server'

import { revalidatePath } from 'next/cache'
import {
  applyReviewQueueDecision,
  getNeedsReviewDocuments,
  getReviewQueueDocuments,
  type DocumentsQueryParams,
} from '@lib/queries/queries'
import type { ReviewQueueDecision, ReviewQueueDocumentsQueryParams } from 'types/reviewQueue'
import { getDashboardSession } from '@root/auth'
import { REVIEW_QUEUE_PATH } from '@constants/paths'

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

export async function getReviewQueueAction(params: ReviewQueueDocumentsQueryParams = {}) {
  return getReviewQueueDocuments(params)
}

export async function getNeedsReviewDocumentsAction(params: DocumentsQueryParams = {}) {
  return getNeedsReviewDocuments(params)
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
  const normalizedDocumentIds = [...new Set(documentIds.map((documentId) => documentId.trim()).filter(Boolean))]

  if (normalizedDocumentIds.length === 0) {
    return {
      ok: false,
      approvedIds: [],
      failed: [],
      error: 'Select at least one document to approve.',
    }
  }

  const results = await Promise.all(
    normalizedDocumentIds.map(async (documentId) => ({
      documentId,
      result: await applyReviewQueueDecisionAction(documentId, 'APPROVED'),
    })),
  )

  const approvedIds = results.filter((entry) => entry.result.ok).map((entry) => entry.documentId)
  const failed = results.flatMap<ReviewQueueBatchApproveFailure>((entry) =>
    entry.result.ok ? [] : [{ documentId: entry.documentId, error: entry.result.error }],
  )

  if (approvedIds.length === 0) {
    return {
      ok: false,
      approvedIds: [],
      failed,
      error:
        failed.length === 1
          ? (failed[0]?.error ?? 'No selected documents could be approved.')
          : 'No selected documents could be approved.',
    }
  }

  if (failed.length > 0) {
    return {
      ok: true,
      approvedIds,
      failed,
      message: `${approvedIds.length} documents approved. ${failed.length} failed.`,
    }
  }

  return {
    ok: true,
    approvedIds,
    failed: [],
    message: `${approvedIds.length} documents approved.`,
  }
}
