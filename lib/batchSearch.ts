import { getSearchCandidateLimit, scoreSearchCandidates } from '@lib/fuzzySearch'
import type { BatchSearchSuggestion } from 'types/batches'

export const BATCH_SEARCH_LIMIT = 7
export const BATCH_SEARCH_MIN_SCORE = 25
export const BATCH_SEARCH_CANDIDATE_LIMIT = getSearchCandidateLimit(BATCH_SEARCH_LIMIT)

interface BatchSearchCandidate {
  id: string
  name: string | null
}

export function getBatchSearchLimit(limit: number | null | undefined): number {
  if (!limit || !Number.isFinite(limit)) {
    return BATCH_SEARCH_LIMIT
  }

  return Math.min(Math.max(Math.floor(limit), 1), BATCH_SEARCH_LIMIT)
}

export function normalizeBatchNameForUniqueness(value: string): string {
  return value.trim().toLowerCase()
}

export function isExactBatchNameMatch(batchName: string | null | undefined, query: string): boolean {
  if (!batchName) {
    return false
  }

  return normalizeBatchNameForUniqueness(batchName) === normalizeBatchNameForUniqueness(query)
}

export function scoreBatchSearchCandidates(
  candidates: readonly BatchSearchCandidate[],
  query: string,
  limit = BATCH_SEARCH_LIMIT,
): BatchSearchSuggestion[] {
  return scoreSearchCandidates(candidates, query, {
    getText: (candidate) => candidate.name,
    limit,
  }).map(({ candidate, score }) => ({
    id: candidate.id,
    name: candidate.name ?? '',
    score,
  }))
}
