import { NextRequest, NextResponse } from "next/server";

import { getDistinctCollectionTags, getDocumentDetail } from "@/lib/queries";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/documents/[id]/collections
 *
 * Returns all distinct collection tags currently in use across the documents
 * table. Used to populate the Assign Collection dropdown in the document
 * detail UI (Path B fallback for documents without a primary_collection_tag
 * at ingest time).
 */
export async function GET(_: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const document = await getDocumentDetail(id);
    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const tags = await getDistinctCollectionTags();
    return NextResponse.json({ collections: tags });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load collections.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
