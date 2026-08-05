import { NextResponse } from 'next/server'

const EXCLUSION_REVIEW_TABLE_NAME = 'drive_exclusion_review_items'
const EXCLUSION_REVIEW_CONFIGURATION_ERROR_CODE = 'EXCLUSION_REVIEW_CONFIGURATION_ERROR'
const MISSING_TABLE_MESSAGE =
  'Exclusion review setup is incomplete in this environment. Run the dashboard database migrations and reload this page.'

interface PrismaRequestErrorLike {
  code?: unknown
  meta?: {
    modelName?: unknown
  }
}

interface ExclusionReviewConfigurationErrorLike {
  code?: unknown
  message?: unknown
}

function isMissingExclusionReviewTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as PrismaRequestErrorLike
  return candidate.code === 'P2021' && candidate.meta?.modelName === EXCLUSION_REVIEW_TABLE_NAME
}

function isExclusionReviewConfigurationError(error: unknown): error is ExclusionReviewConfigurationErrorLike {
  if (!error || typeof error !== 'object') {
    return false
  }

  return (error as ExclusionReviewConfigurationErrorLike).code === EXCLUSION_REVIEW_CONFIGURATION_ERROR_CODE
}

export function buildExclusionReviewRouteErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  if (isExclusionReviewConfigurationError(error)) {
    return NextResponse.json(
      {
        error:
          typeof error.message === 'string' && error.message
            ? error.message
            : 'Exclusion Review configuration is incomplete.',
      },
      { status: 503 },
    )
  }

  if (isMissingExclusionReviewTableError(error)) {
    return NextResponse.json({ error: MISSING_TABLE_MESSAGE }, { status: 503 })
  }

  const message = error instanceof Error && error.message ? error.message : fallbackMessage
  return NextResponse.json({ error: message }, { status: 500 })
}
