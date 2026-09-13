import { NextRequest, NextResponse } from 'next/server'

import { getDashboardSession } from '@root/auth'
import { logEvent } from '@lib/observability'
import { getDocumentDetail } from '@lib/queries/documentQueries'
import {
  authorizeDocumentEditing,
  DocumentEditNotFoundError,
  DocumentEditValidationError,
} from '@lib/queries/documentEditQueries'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const session = await getDashboardSession()
  const editorEmail = session?.user?.email?.trim()
  if (!editorEmail) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const reason =
    body && typeof body === 'object' && !Array.isArray(body) && 'reason' in body
      ? (body as { reason?: unknown }).reason
      : undefined
  if (typeof reason !== 'string') return NextResponse.json({ error: 'A reason is required.' }, { status: 400 })

  const { id: documentId } = await context.params
  try {
    const result = await authorizeDocumentEditing({ documentId, editorEmail, reason })
    const detail = await getDocumentDetail(documentId)
    if (!detail) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    return NextResponse.json({ ...result, detail })
  } catch (error: unknown) {
    if (error instanceof DocumentEditValidationError) {
      logEvent('warn', 'document_edit_authorization_validation_failed', {
        documentId,
        editorEmail,
        errorMessage: error.message,
      })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof DocumentEditNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json({ error: 'Unable to authorize document editing.' }, { status: 500 })
  }
}
