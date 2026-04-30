import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lib/db'
import { getTagSearchLimit, scoreTags } from '@lib/tag-utils'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = request.nextUrl.searchParams.get('query')?.trim() ?? ''
    const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? '7')
    const limit = getTagSearchLimit(requestedLimit)

    if (!query) {
      return NextResponse.json({ tags: [] })
    }

    const candidates = await db.tags.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        notes: true,
      },
    })

    const tags = scoreTags(candidates, query, limit)
    return NextResponse.json({ tags })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to search tags.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
