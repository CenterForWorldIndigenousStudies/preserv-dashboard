'use server'

import { revalidatePath } from 'next/cache'

import { EXCLUSION_REVIEW_PATH } from '@constants/paths'
import {
  applyExclusionReviewDecision,
  loadExclusionReviewChildren,
  loadExclusionReviewRootTree,
  reconcileExclusionReviewBranch,
  searchExclusionReviewTree,
} from '@lib/exclusionReviewQueries'
import { getDashboardSession } from '@root/auth'
import type { ExclusionReviewDecision } from 'types/exclusionReview'

function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase()
  return trimmed ? trimmed : null
}

export async function getExclusionReviewTreeAction(
  parentDriveId?: string,
  pageToken: string | null = null,
) {
  const session = await getDashboardSession()
  const email = normalizeEmail(session?.user?.email)

  if (!email) {
    return { ok: false, error: 'Authentication required.' } as const
  }

  if (parentDriveId?.trim()) {
    const page = await loadExclusionReviewChildren(parentDriveId.trim(), pageToken)
    return { ok: true, page } as const
  }

  const tree = await loadExclusionReviewRootTree()
  return { ok: true, tree } as const
}

export async function searchExclusionReviewTreeAction(query: string) {
  const session = await getDashboardSession()
  const email = normalizeEmail(session?.user?.email)

  if (!email) {
    return { ok: false, error: 'Authentication required.' } as const
  }

  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return { ok: false, error: 'Search query is required.' } as const
  }

  const result = await searchExclusionReviewTree(trimmedQuery)
  return { ok: true, result } as const
}

export async function applyExclusionReviewDecisionAction(
  driveId: string,
  decision: ExclusionReviewDecision,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const trimmedDriveId = driveId.trim()
  if (!trimmedDriveId) {
    return { ok: false, error: 'Drive ID is required.' }
  }

  const session = await getDashboardSession()
  const reviewerEmail = normalizeEmail(session?.user?.email)

  if (!reviewerEmail) {
    return { ok: false, error: 'Authentication required.' }
  }

  await applyExclusionReviewDecision({
    driveId: trimmedDriveId,
    decision,
    reviewerEmail,
  })
  revalidatePath(EXCLUSION_REVIEW_PATH)

  return {
    ok: true,
    message: decision === null ? 'Review cleared.' : `Marked ${decision}.`,
  }
}

export async function syncExclusionReviewBranchAction(
  driveId: string,
): Promise<
  | { ok: true; message: string }
  | { ok: false; error: string }
> {
  const trimmedDriveId = driveId.trim()
  if (!trimmedDriveId) {
    return { ok: false, error: 'Drive ID is required.' }
  }

  const session = await getDashboardSession()
  const reviewerEmail = normalizeEmail(session?.user?.email)

  if (!reviewerEmail) {
    return { ok: false, error: 'Authentication required.' }
  }

  await reconcileExclusionReviewBranch(trimmedDriveId)
  revalidatePath(EXCLUSION_REVIEW_PATH)

  return { ok: true, message: 'Branch sync requested.' }
}
