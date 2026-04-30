import { createHash } from 'node:crypto'

export interface TagSearchResult {
  id: string
  name: string
  notes: string | null
  score: number
}

interface ScoredTag extends TagSearchResult {
  normalizedName: string
}

const DEFAULT_SEARCH_LIMIT = 7

export function normalizeTagName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeTagKey(value: string): string {
  return normalizeTagName(value).toLowerCase()
}

export function buildNameHash(value: string): string {
  return createHash('sha256').update(normalizeTagKey(value)).digest('hex')
}

export function getTagSearchLimit(limit: number | null | undefined): number {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_SEARCH_LIMIT
  }

  return Math.min(Math.max(Math.floor(limit), 1), DEFAULT_SEARCH_LIMIT)
}

export function getTagSearchCandidateLimit(limit: number): number {
  return Math.max(limit * 100, 5000)
}

export function scoreTags(
  tags: Array<{ id: string; name: string; notes: string | null }>,
  query: string,
  limit = DEFAULT_SEARCH_LIMIT,
): TagSearchResult[] {
  const normalizedQuery = normalizeTagKey(query)
  if (!normalizedQuery) {
    return []
  }

  return tags
    .map((tag) => scoreTag(tag, normalizedQuery))
    .filter((tag): tag is ScoredTag => tag !== null)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.name.localeCompare(right.name)
    })
    .slice(0, limit)
    .map(({ normalizedName: _normalizedName, ...tag }) => tag)
}

function scoreTag(
  tag: { id: string; name: string; notes: string | null },
  normalizedQuery: string,
): ScoredTag | null {
  const normalizedName = normalizeTagKey(tag.name)
  if (!normalizedName) {
    return null
  }

  const prefixScore = normalizedName.startsWith(normalizedQuery)
    ? normalizedName === normalizedQuery
      ? 140
      : 105 - Math.min(normalizedName.length - normalizedQuery.length, 20)
    : 0
  const includesScore = !normalizedName.startsWith(normalizedQuery) && normalizedName.includes(normalizedQuery)
    ? 18
    : 0
  const levenshteinSimilarity = similarityFromLevenshtein(normalizedQuery, normalizedName)
  const trigramSimilarityScore = trigramSimilarity(normalizedQuery, normalizedName)

  const levenshteinScore = levenshteinSimilarity * 45
  const trigramScore = trigramSimilarityScore * 25
  const score = prefixScore + includesScore + levenshteinScore + trigramScore

  if (score <= 0) {
    return null
  }

  return {
    ...tag,
    normalizedName,
    score,
  }
}

function similarityFromLevenshtein(left: string, right: string): number {
  const maxLength = Math.max(left.length, right.length)
  if (maxLength === 0) {
    return 1
  }

  const distance = levenshteinDistance(left, right)
  return Math.max(0, 1 - distance / maxLength)
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) {
    return 0
  }

  if (left.length === 0) {
    return right.length
  }

  if (right.length === 0) {
    return left.length
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  const current = Array.from({ length: right.length + 1 }, () => 0)

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    current[0] = leftIndex + 1

    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex] === right[rightIndex] ? 0 : 1
      current[rightIndex + 1] = Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + substitutionCost,
      )
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index]
    }
  }

  return previous[right.length]
}

function trigramSimilarity(left: string, right: string): number {
  const leftTrigrams = buildTrigrams(left)
  const rightTrigrams = buildTrigrams(right)

  if (leftTrigrams.size === 0 || rightTrigrams.size === 0) {
    return 0
  }

  let intersection = 0
  for (const trigram of leftTrigrams) {
    if (rightTrigrams.has(trigram)) {
      intersection += 1
    }
  }

  const union = new Set([...leftTrigrams, ...rightTrigrams]).size
  return union === 0 ? 0 : intersection / union
}

function buildTrigrams(value: string): Set<string> {
  const normalized = `  ${value}  `
  const trigrams = new Set<string>()

  for (let index = 0; index <= normalized.length - 3; index += 1) {
    trigrams.add(normalized.slice(index, index + 3))
  }

  return trigrams
}
