import { NextRequest, NextResponse } from 'next/server'

import { buildExclusionReviewRouteErrorResponse } from '@lib/exclusionReviewApiErrors'
import { getExclusionReviewConfig } from '@lib/exclusionReviewConfig'
import { applyExclusionReviewDecision } from '@lib/exclusionReviewQueries'
import { getDashboardSession } from '@root/auth'
import type { ExclusionReviewDecision } from 'types/exclusionReview'

function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase()
  return trimmed ? trimmed : null
}

function normalizeDecision(value: unknown): ExclusionReviewDecision | undefined {
  if (value === null) {
    return null
  }

  return value === 'include' || value === 'exclude' ? value : undefined
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

  const { allowedEditorEmails } = getExclusionReviewConfig()
  if (!allowedEditorEmails.includes(email)) {
    return NextResponse.json(
      { error: 'You do not have permission to edit exclusion review.' },
      { status: 403 },
    )
  }

  const body = (await request.json()) as {
    driveId?: string
    decision?: ExclusionReviewDecision
  }
  const driveId = body.driveId?.trim()
  if (!driveId) {
    return NextResponse.json({ error: 'driveId is required.' }, { status: 400 })
  }

  const decision = normalizeDecision(body.decision)
  if (decision === undefined) {
    return NextResponse.json(
      { error: 'decision must be include, exclude, or null.' },
      { status: 400 },
    )
  }

  try {
    const result = await applyExclusionReviewDecision({
      driveId,
      decision,
      reviewerEmail: email,
    })

    return NextResponse.json(result)
  } catch (error) {
    return buildExclusionReviewRouteErrorResponse(
      error,
      'Unable to save review decision.',
    )
  }
}
