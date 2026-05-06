import { NextRequest, NextResponse } from 'next/server'
import { deleteTag, deleteTagAndDocumentAssociations } from '@lib/queries'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

interface DeleteTagRequestBody {
  cascade?: unknown
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params
    const body = (await request.json().catch(() => null)) as DeleteTagRequestBody | null
    const cascade = body?.cascade === true

    if (cascade) {
      await deleteTagAndDocumentAssociations(id)
      return NextResponse.json({ success: true })
    }

    await deleteTag(id)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete tag.'
    const status =
      message === 'Tag not found.'
        ? 404
        : message === 'Tag id is required.'
          ? 400
          : message === 'Cannot delete a tag that is still associated with documents.'
            ? 409
            : 500
    return NextResponse.json({ error: message }, { status })
  }
}
