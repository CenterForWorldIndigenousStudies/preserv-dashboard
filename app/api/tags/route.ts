import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@lib/prisma/generated/client'
import { createEditHistoryEntry } from '@lib/editHistory'
import { db } from '@lib/db'
import { buildNameHash, normalizeTagName } from '@lib/tag-utils'

interface CreateTagRequestBody {
  name?: unknown
  notes?: unknown
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as CreateTagRequestBody
    const name = typeof body.name === 'string' ? normalizeTagName(body.name) : ''
    const notes = typeof body.notes === 'string' ? body.notes.trim() : ''

    if (!name) {
      return NextResponse.json({ error: 'Tag name is required.' }, { status: 400 })
    }

    const nameHash = buildNameHash(name)
    const existingTag = await db.tags.findFirst({
      where: {
        OR: [{ name_hash: nameHash }, { name }],
      },
    })

    if (existingTag) {
      return NextResponse.json({ error: 'A tag with this name already exists.', tag: existingTag }, { status: 409 })
    }

    const tag = await db.$transaction(async (tx) => {
      const createdTag = await tx.tags.create({
        data: {
          id: crypto.randomUUID(),
          name,
          notes: notes || null,
        },
      })

      await createEditHistoryEntry(tx, {
        entityTable: 'tags',
        entityId: createdTag.id,
        previousValue: null,
        newValue: createdTag,
        editSummary: `Created tag "${createdTag.name}"`,
      })

      return createdTag
    })

    return NextResponse.json({ tag }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'A tag with this name already exists.' }, { status: 409 })
    }

    const message = error instanceof Error ? error.message : 'Failed to create tag.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
