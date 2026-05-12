'use server'

import { getNeedsReviewDocuments, getReviewQueueDocuments, type DocumentsQueryParams } from '@lib/queries'
import type { ReviewQueueDocumentsQueryParams } from '@lib/types'

export async function getReviewQueueAction(params: ReviewQueueDocumentsQueryParams = {}) {
  return getReviewQueueDocuments(params)
}

export async function getNeedsReviewDocumentsAction(params: DocumentsQueryParams = {}) {
  return getNeedsReviewDocuments(params)
}
