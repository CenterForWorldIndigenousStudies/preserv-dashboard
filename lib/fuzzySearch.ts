const DEFAULT_SEARCH_LIMIT = 7

export interface ScoredSearchCandidate<T> {
  candidate: T
  score: number
}

export interface ScoreSearchCandidatesOptions<T> {
  getText: (candidate: T) => string | null | undefined
  limit?: number
}

interface ScoredCandidate<T> extends ScoredSearchCandidate<T> {
  normalizedText: string
  originalIndex: number
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function getSearchCandidateLimit(limit: number): number {
  return Math.max(limit * 100, 5000)
}

export function scoreSearchCandidates<T>(
  candidates: readonly T[],
  query: string,
  options: ScoreSearchCandidatesOptions<T>,
): ScoredSearchCandidate<T>[] {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) {
    return []
  }

  return candidates
    .map((candidate, originalIndex) => {
      const normalizedText = normalizeSearchText(options.getText(candidate) ?? '')
      const score = scoreSearchText(normalizedText, normalizedQuery)

      if (!normalizedText || score <= 0) {
        return null
      }

      return {
        candidate,
        score,
        normalizedText,
        originalIndex,
      }
    })
    .filter((candidate): candidate is ScoredCandidate<T> => candidate !== null)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      const textComparison = left.normalizedText.localeCompare(right.normalizedText)
      return textComparison !== 0 ? textComparison : left.originalIndex - right.originalIndex
    })
    .slice(0, options.limit ?? DEFAULT_SEARCH_LIMIT)
    .map(({ candidate, score }) => ({ candidate, score }))
}

function scoreSearchText(normalizedText: string, normalizedQuery: string): number {
  const prefixScore = normalizedText.startsWith(normalizedQuery)
    ? normalizedText === normalizedQuery
      ? 140
      : 105 - Math.min(normalizedText.length - normalizedQuery.length, 20)
    : 0
  const includesScore = !normalizedText.startsWith(normalizedQuery) && normalizedText.includes(normalizedQuery) ? 18 : 0
  const levenshteinSimilarity = similarityFromLevenshtein(normalizedQuery, normalizedText)
  const trigramSimilarityScore = trigramSimilarity(normalizedQuery, normalizedText)

  const levenshteinScore = levenshteinSimilarity * 45
  const trigramScore = trigramSimilarityScore * 25
  return prefixScore + includesScore + levenshteinScore + trigramScore
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
