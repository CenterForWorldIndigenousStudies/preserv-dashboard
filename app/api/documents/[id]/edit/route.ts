import { NextRequest, NextResponse } from 'next/server'

import { getDashboardSession } from '@root/auth'
import { logEvent } from '@lib/observability'
import { getDocumentDetail } from '@lib/queries/documentQueries'
import {
  applyDocumentEdit,
  DocumentEditNotFoundError,
  DocumentEditValidationError,
} from '@lib/queries/documentEditQueries'
import type { DocumentEditSnapshot } from 'types/documentEditing'

interface RouteContext {
  params: Promise<{ id: string }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const session = await getDashboardSession()
  const editorEmail = session?.user?.email?.trim()
  if (!editorEmail) {
    return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const snapshot = isRecord(body) && 'snapshot' in body ? body.snapshot : body
  if (!isRecord(snapshot)) {
    return NextResponse.json({ error: 'A document edit snapshot is required.' }, { status: 400 })
  }

  const { id: documentId } = await context.params
  try {
    const result = await applyDocumentEdit({
      documentId,
      editorEmail,
      snapshot: snapshot as unknown as DocumentEditSnapshot,
    })
    const detail = await getDocumentDetail(documentId)

    if (!detail) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    }

    return NextResponse.json({ ...result, detail })
  } catch (error: unknown) {
    if (error instanceof DocumentEditValidationError) {
      logEvent('warn', 'document_edit_validation_failed', {
        documentId,
        editorEmail,
        errorMessage: error.message,
      })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (error instanceof DocumentEditNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ error: 'Unable to save document changes.' }, { status: 500 })
  }
}
