import { NextRequest, NextResponse } from 'next/server'

import { getReviewQueue } from '@lib/queries'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = Number(searchParams.get('page') ?? '1')
    const status = searchParams.get('status') ?? undefined
    const field = searchParams.get('field') ?? undefined

    const reviews = await getReviewQueue({
      page,
      status,
      field,
    })

    return NextResponse.json(reviews)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load review queue.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
