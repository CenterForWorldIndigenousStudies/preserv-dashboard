import { NextRequest, NextResponse } from 'next/server'

import { getDashboardSession } from '@root/auth'
import { searchDocumentRelationships } from '@lib/queries/documentRelationshipQueries'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getDashboardSession()
  if (!session?.user?.email?.trim()) {
    return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  }

  try {
    const items = await searchDocumentRelationships('contributor', request.nextUrl.searchParams.get('q') ?? '')
    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ error: 'Unable to search contributors.' }, { status: 500 })
  }
}
