import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@lib/prisma/generated/client'
import { createEditHistoryEntry } from '@lib/editHistory'
import { db } from '@lib/db'
import { buildNameHash, normalizeTagName } from '@lib/tag-utils'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

interface AddDocumentTagRequestBody {
  tagId?: unknown
  tagName?: unknown
  notes?: unknown
}

interface RemoveDocumentTagRequestBody {
  tagId?: unknown
  deleteTagFromSystem?: unknown
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: documentId } = await context.params
    const body = (await request.json()) as AddDocumentTagRequestBody
    const tagId = typeof body.tagId === 'string' ? body.tagId : undefined
    const tagName = typeof body.tagName === 'string' ? normalizeTagName(body.tagName) : ''
    const notes = typeof body.notes === 'string' ? body.notes.trim() : ''

    const document = await db.documents.findUnique({ where: { id: documentId } })
    if (!document) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    }

    if (!tagId && !tagName) {
      return NextResponse.json({ error: 'tagId or tagName is required.' }, { status: 400 })
    }

    const result = await db.$transaction(async (tx) => {
      let tag = tagId ? await tx.tags.findUnique({ where: { id: tagId } }) : null

      if (!tag && tagName) {
        const nameHash = buildNameHash(tagName)
        tag = await tx.tags.findFirst({
          where: {
            OR: [{ name_hash: nameHash }, { name: tagName }],
          },
        })

        if (!tag) {
          tag = await tx.tags.create({
            data: {
              id: crypto.randomUUID(),
              name: tagName,
              notes: notes || null,
            },
          })

          await createEditHistoryEntry(tx, {
            entityTable: 'tags',
            entityId: tag.id,
            previousValue: null,
            newValue: tag,
            editSummary: `Created tag "${tag.name}"`,
          })
        }
      }

      if (!tag) {
        throw new Error('Tag not found.')
      }

      const existingLink = await tx.document_to_tags.findFirst({
        where: {
          document_id: documentId,
          tag_id: tag.id,
        },
        include: { tags: true },
      })

      if (existingLink) {
        return {
          documentTag: existingLink,
          createdTag: false,
          createdAssociation: false,
        }
      }

      const createdLink = await tx.document_to_tags.create({
        data: {
          id: crypto.randomUUID(),
          document_id: documentId,
          tag_id: tag.id,
          notes: notes || null,
        },
        include: { tags: true },
      })

      await createEditHistoryEntry(tx, {
        entityTable: 'document_to_tags',
        entityId: createdLink.id,
        previousValue: null,
        newValue: createdLink,
        editSummary: `Added tag "${tag.name}" to document`,
      })

      return {
        documentTag: createdLink,
        createdTag: Boolean(tagName),
        createdAssociation: true,
      }
    })

    return NextResponse.json(result, { status: result.createdAssociation ? 201 : 200 })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'This tag is already attached to the document.' }, { status: 409 })
    }

    const message = error instanceof Error ? error.message : 'Failed to add tag to document.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: documentId } = await context.params
    const body = (await request.json()) as RemoveDocumentTagRequestBody
    const tagId = typeof body.tagId === 'string' ? body.tagId : ''
    const deleteTagFromSystem = body.deleteTagFromSystem === true

    if (!tagId) {
      return NextResponse.json({ error: 'tagId is required.' }, { status: 400 })
    }

    const documentTag = await db.document_to_tags.findFirst({
      where: {
        document_id: documentId,
        tag_id: tagId,
      },
      include: { tags: true },
    })

    if (!documentTag) {
      return NextResponse.json({ error: 'Tag association not found.' }, { status: 404 })
    }

    const result = await db.$transaction(async (tx) => {
      await tx.document_to_tags.delete({
        where: { id: documentTag.id },
      })

      await createEditHistoryEntry(tx, {
        entityTable: 'document_to_tags',
        entityId: documentTag.id,
        previousValue: documentTag,
        newValue: null,
        editSummary: `Removed tag "${documentTag.tags.name}" from document`,
      })

      let deletedTag = false
      if (deleteTagFromSystem) {
        const remainingUsage = await tx.document_to_tags.count({
          where: { tag_id: tagId },
        })

        if (remainingUsage === 0) {
          const tagRecord = await tx.tags.findUnique({ where: { id: tagId } })
          if (tagRecord) {
            await tx.tags.delete({ where: { id: tagId } })
            await createEditHistoryEntry(tx, {
              entityTable: 'tags',
              entityId: tagId,
              previousValue: tagRecord,
              newValue: null,
              editSummary: `Deleted tag "${tagRecord.name}"`,
            })
            deletedTag = true
          }
        }
      }

      return { deletedTag }
    })

    return NextResponse.json({ success: true, deletedTag: result.deletedTag })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove tag from document.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
