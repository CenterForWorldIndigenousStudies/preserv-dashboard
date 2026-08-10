'use server'

import { getBatchSummary } from '@lib/queries/queries'

export async function getBatchSummaryAction() {
  return getBatchSummary()
}
