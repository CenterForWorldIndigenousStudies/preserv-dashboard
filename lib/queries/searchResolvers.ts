import { PrismaClient, type Prisma } from '@lib/prisma/generated/client'

import { BATCH_SEARCH_MIN_SCORE, isExactBatchNameMatch, scoreBatchSearchCandidates } from '@lib/batchSearch'
import { getSearchCandidateLimit } from '@lib/fuzzySearch'
import { db } from '@lib/db'
import { getTagSearchCandidateLimit, scoreTags } from '@lib/tagUtils'

export type SearchQueryDbClient = PrismaClient | Prisma.TransactionClient

const TAG_SEARCH_LIMIT = 25
const TAG_SEARCH_MIN_SCORE = 25
const BATCH_SEARCH_LIMIT = 25

export async function resolveTagSearchIds(
  term: string | undefined,
  client: SearchQueryDbClient = db,
): Promise<string[] | undefined> {
  if (!term) {
    return undefined
  }

  const candidates = await client.tags.findMany({
    orderBy: { name: 'asc' },
    take: getTagSearchCandidateLimit(TAG_SEARCH_LIMIT),
    select: {
      id: true,
      name: true,
      notes: true,
    },
  })

  return scoreTags(candidates, term, TAG_SEARCH_LIMIT)
    .filter((tag) => tag.score >= TAG_SEARCH_MIN_SCORE)
    .map((tag) => tag.id)
}

export async function resolveBatchSearchIds(
  term: string | undefined,
  client: SearchQueryDbClient = db,
): Promise<string[] | undefined> {
  if (!term) {
    return undefined
  }

  const candidates = await client.batches.findMany({
    orderBy: { name: 'asc' },
    take: getSearchCandidateLimit(BATCH_SEARCH_LIMIT),
    select: { id: true, name: true },
  })

  const exactMatch = candidates.find((candidate) => isExactBatchNameMatch(candidate.name, term))
  if (exactMatch) {
    return [exactMatch.id]
  }

  return scoreBatchSearchCandidates(candidates, term, BATCH_SEARCH_LIMIT)
    .filter((batch) => batch.score >= BATCH_SEARCH_MIN_SCORE)
    .map((batch) => batch.id)
}
