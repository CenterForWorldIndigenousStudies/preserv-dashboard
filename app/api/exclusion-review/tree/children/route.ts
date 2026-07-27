import { NextRequest, NextResponse } from 'next/server'

import { buildExclusionReviewRouteErrorResponse } from '@lib/exclusionReviewApiErrors'
import { loadExclusionReviewChildren } from '@lib/exclusionReviewQueries'
import { getDashboardSession } from '@root/auth'

function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase()
  return trimmed ? trimmed : null
}

export async function GET(request: NextRequest) {
  const session = await getDashboardSession()
  const email = normalizeEmail(session?.user?.email)

  if (!email) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    )
  }

  const parentId = request.nextUrl.searchParams.get('parentId')?.trim()
  const pageToken = request.nextUrl.searchParams.get('pageToken')?.trim() || null

  if (!parentId) {
    return NextResponse.json({ error: 'parentId is required.' }, { status: 400 })
  }

  try {
    const page = await loadExclusionReviewChildren(parentId, pageToken)

    return NextResponse.json({ page })
  } catch (error) {
    return buildExclusionReviewRouteErrorResponse(
      error,
      'Unable to load branch children.',
    )
  }
}
