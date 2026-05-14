'use server'

import { revalidatePath } from 'next/cache'
import { applyReviewQueueDecision, getNeedsReviewDocuments, getReviewQueueDocuments, type DocumentsQueryParams } from '@lib/queries'
import type { ReviewQueueDecision, ReviewQueueDocumentsQueryParams } from '@lib/types'
import { auth } from '../../auth'

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

  const session = await auth()
  const validatorName = session?.user?.name?.trim() || null

  try {
    await applyReviewQueueDecision({
      documentId: trimmedDocumentId,
      decision,
      validationTimestamp: Math.floor(Date.now() / 1000),
      validatorName,
    })
    revalidatePath('/review-queue')

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
