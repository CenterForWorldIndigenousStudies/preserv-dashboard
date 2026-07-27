import { NextRequest, NextResponse } from 'next/server'

import { buildExclusionReviewRouteErrorResponse } from '@lib/exclusionReviewApiErrors'
import { searchExclusionReviewTree } from '@lib/exclusionReviewQueries'
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

  const query = request.nextUrl.searchParams.get('q')?.trim()
  if (!query) {
    return NextResponse.json({ error: 'q is required.' }, { status: 400 })
  }

  try {
    const result = await searchExclusionReviewTree(query)
    return NextResponse.json({ result })
  } catch (error) {
    return buildExclusionReviewRouteErrorResponse(
      error,
      'Unable to search exclusion review.',
    )
  }
}
