import { NextResponse } from 'next/server'

import { db } from '@lib/db'

export async function GET(): Promise<NextResponse> {
  try {
    const rows = await db.collections.findMany({
      select: { tag_id: true, tags: { select: { name: true } } },
      orderBy: { tags: { name: 'asc' } },
    })
    const collections = rows.flatMap((row) => {
      const name = row.tags.name?.trim()
      return name ? [{ name, tagId: row.tag_id }] : []
    })
    return NextResponse.json({ collections })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load collections.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
