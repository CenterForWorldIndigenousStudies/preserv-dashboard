import { NextResponse } from 'next/server'

const EXCLUSION_REVIEW_TABLE_NAME = 'drive_exclusion_review_items'
const MISSING_TABLE_MESSAGE =
  'Exclusion review setup is incomplete in this environment. Run the dashboard database migrations and reload this page.'

interface PrismaRequestErrorLike {
  code?: unknown
  meta?: {
    modelName?: unknown
  }
}

function isMissingExclusionReviewTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as PrismaRequestErrorLike
  return (
    candidate.code === 'P2021' &&
    candidate.meta?.modelName === EXCLUSION_REVIEW_TABLE_NAME
  )
}

export function buildExclusionReviewRouteErrorResponse(
  error: unknown,
  fallbackMessage: string,
): NextResponse {
  if (isMissingExclusionReviewTableError(error)) {
    return NextResponse.json(
      { error: MISSING_TABLE_MESSAGE },
      { status: 503 },
    )
  }

  const message =
    error instanceof Error && error.message ? error.message : fallbackMessage
  return NextResponse.json({ error: message }, { status: 500 })
}
