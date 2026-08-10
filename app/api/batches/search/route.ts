import { NextRequest, NextResponse } from 'next/server'

import { db } from '@lib/db'
import {
  BATCH_SEARCH_CANDIDATE_LIMIT,
  getBatchSearchLimit,
  scoreBatchSearchCandidates,
} from '@lib/batchSearch'
import { buildBatchNameHash } from '@lib/batchNameHash'
import type { BatchSearchResponse } from 'types/batches'

export async function GET(request: NextRequest): Promise<NextResponse<BatchSearchResponse | { error: string }>> {
  try {
    const query = request.nextUrl.searchParams.get('query')?.trim() ?? ''
    const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? '')
    const limit = getBatchSearchLimit(requestedLimit)

    if (!query) {
      return NextResponse.json({ batches: [], exactMatch: null })
    }

    const [candidates, exactMatchRow] = await Promise.all([
      db.batches.findMany({
        orderBy: { name: 'asc' },
        take: BATCH_SEARCH_CANDIDATE_LIMIT,
        select: { id: true, name: true },
      }),
      db.batches.findFirst({
        where: { name_hash: buildBatchNameHash(query) },
        select: { id: true, name: true },
      }),
    ])

    const batches = scoreBatchSearchCandidates(candidates, query, limit)
    const exactMatch = exactMatchRow?.name
      ? (scoreBatchSearchCandidates([exactMatchRow], query, 1)[0] ?? null)
      : null

    return NextResponse.json({ batches, exactMatch })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to search batches.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
