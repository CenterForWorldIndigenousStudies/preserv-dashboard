'use server'

import { getReviewQueueDocuments } from '@lib/queries'

export async function getReviewQueueAction() {
  return getReviewQueueDocuments()
}
