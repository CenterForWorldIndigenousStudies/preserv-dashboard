import { NextResponse } from 'next/server'
import { createEditHistoryEntry } from '@lib/editHistory'
import { db } from '@lib/db'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(_: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params

    const tag = await db.tags.findUnique({
      where: { id },
      include: {
        document_to_tags: {
          select: { id: true },
        },
      },
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found.' }, { status: 404 })
    }

    if (tag.document_to_tags.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a tag that is still associated with documents.' },
        { status: 409 },
      )
    }

    await db.$transaction(async (tx) => {
      await tx.tags.delete({
        where: { id },
      })

      await createEditHistoryEntry(tx, {
        entityTable: 'tags',
        entityId: id,
        previousValue: tag,
        newValue: null,
        editSummary: `Deleted tag "${tag.name}"`,
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete tag.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
