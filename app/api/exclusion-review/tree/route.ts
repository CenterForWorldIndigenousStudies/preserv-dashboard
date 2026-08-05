import { NextResponse } from 'next/server'

import { buildExclusionReviewRouteErrorResponse } from '@lib/exclusionReviewApiErrors'
import { getExclusionReviewConfig } from '@lib/exclusionReviewConfig'
import { loadExclusionReviewRootTree } from '@lib/exclusionReviewQueries'
import { getDashboardSession } from '@root/auth'

function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase()
  return trimmed ? trimmed : null
}

export async function GET() {
  const session = await getDashboardSession()
  const email = normalizeEmail(session?.user?.email)

  if (!email) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  try {
    const { allowedEditorEmails } = getExclusionReviewConfig()
    const tree = await loadExclusionReviewRootTree()

    return NextResponse.json({
      tree,
      isEditor: allowedEditorEmails.includes(email),
    })
  } catch (error) {
    return buildExclusionReviewRouteErrorResponse(error, 'Unable to load exclusion review.')
  }
}
