import { NextResponse } from 'next/server'
import { db } from '@lib/db'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(_: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params

    const count = await db.document_to_tags.count({
      where: { tag_id: id },
    })

    return NextResponse.json({ count })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load usage count.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
