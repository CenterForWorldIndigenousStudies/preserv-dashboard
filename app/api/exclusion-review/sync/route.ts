import { NextRequest, NextResponse } from 'next/server'

import { buildExclusionReviewRouteErrorResponse } from '@lib/exclusionReviewApiErrors'
import { reconcileExclusionReviewBranch } from '@lib/exclusionReviewQueries'
import { getDashboardSession } from '@root/auth'

function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase()
  return trimmed ? trimmed : null
}

export async function POST(request: NextRequest) {
  const session = await getDashboardSession()
  const email = normalizeEmail(session?.user?.email)

  if (!email) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    )
  }

  const body = (await request.json()) as { driveId?: string }
  const driveId = body.driveId?.trim()

  if (!driveId) {
    return NextResponse.json({ error: 'driveId is required.' }, { status: 400 })
  }

  try {
    const result = await reconcileExclusionReviewBranch(driveId)
    return NextResponse.json({ result })
  } catch (error) {
    return buildExclusionReviewRouteErrorResponse(
      error,
      'Unable to sync branch.',
    )
  }
}
