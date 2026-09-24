import { NextRequest, NextResponse } from 'next/server'

import { getDashboardSession } from '@root/auth'
import { updateDocumentCollectionTags } from '@lib/queries/collectionQueries'
import { getDistinctCollections } from '@lib/queries/queries'
import { getDocumentDetail } from '@lib/queries/documentQueries'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/documents/[id]/collections
 *
 * Returns all collection names from the collections table. Used to populate
 * the Assign Collection dropdown in the document
 * detail UI (Path B fallback for documents without a primary_collection_tag
 * at ingest time).
 */
export async function GET(_: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params

    const document = await getDocumentDetail(id)
    if (!document) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    }

    const collections = await getDistinctCollections()
    return NextResponse.json({ collections })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load collections.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PATCH /api/documents/[id]/collections
 *
 * Replaces the document's collection-backed tag associations. Ordinary tags
 * are left untouched and must be edited through the document tags endpoint.
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await getDashboardSession()
    if (!session?.user?.email?.trim()) {
      return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
    }

    const { id } = await context.params
    const document = await getDocumentDetail(id)
    if (!document) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    }

    const body = (await request.json()) as Record<string, unknown>
    const tags = body.collection_tags
    if (!Array.isArray(tags)) {
      return NextResponse.json({ error: 'collection_tags must be an array of strings.' }, { status: 400 })
    }

    const sanitized = tags
      .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      .map((tag) => tag.trim())

    const updated = await updateDocumentCollectionTags(id, sanitized)
    if (!updated) {
      return NextResponse.json({ error: 'Document may have been deleted.' }, { status: 409 })
    }

    return NextResponse.json({ id, collection_tags: sanitized })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update document collections.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
