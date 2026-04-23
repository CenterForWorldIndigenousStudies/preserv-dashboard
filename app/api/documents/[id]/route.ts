import { NextRequest, NextResponse } from 'next/server'

import { getDocumentDetail, updateDocumentCollectionTags } from '@lib/queries'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(_: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params
    const document = await getDocumentDetail(id)

    if (!document) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load document.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PATCH /api/documents/[id]
 *
 * Supports partial updates to a document. Currently limited to:
 * - collection_tags: string[]  — Path B fallback: manually assign collection tags
 *
 * Use this endpoint when a document lacks a primary_collection_tag at
 * ingest time and a human needs to assign one manually before the document
 * can proceed to the next pipeline stage.
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params

    // Verify document exists first
    const existing = await getDocumentDetail(id)
    if (!existing) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    }

    const body = (await request.json()) as Record<string, unknown>

    // Path B: assign collection tags
    if ('collection_tags' in body) {
      const tags = body.collection_tags

      if (!Array.isArray(tags)) {
        return NextResponse.json({ error: 'collection_tags must be an array of strings.' }, { status: 400 })
      }

      const sanitized = tags
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim())

      const updated = await updateDocumentCollectionTags(id, sanitized)

      if (!updated) {
        return NextResponse.json({ error: 'No rows updated. Document may have been deleted.' }, { status: 409 })
      }

      return NextResponse.json({ id, collection_tags: sanitized })
    }

    return NextResponse.json(
      { error: 'No supported fields in request body. Supported: collection_tags.' },
      { status: 400 },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update document.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
