import { PROTECTED_TAGS } from '@constants/tags'
import { getSearchCandidateLimit, normalizeSearchText, scoreSearchCandidates } from '@lib/fuzzySearch'

export interface TagSearchResult {
  id: string
  name: string
  notes: string | null
  score: number
}

const DEFAULT_SEARCH_LIMIT = 7
const PROTECTED_TAG_KEYS = new Set(PROTECTED_TAGS.map((tag) => normalizeTagKey(tag)))

export function normalizeTagName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeTagKey(value: string): string {
  return normalizeSearchText(normalizeTagName(value))
}

export function isProtectedTagName(value: string | null | undefined): boolean {
  if (!value) {
    return false
  }

  return PROTECTED_TAG_KEYS.has(normalizeTagKey(value))
}

export function getProtectedTagDeletionMessage(name: string): string {
  return `Tag "${name}" is protected and cannot be deleted from the system.`
}

export function getTagSearchLimit(limit: number | null | undefined): number {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_SEARCH_LIMIT
  }

  return Math.min(Math.max(Math.floor(limit), 1), DEFAULT_SEARCH_LIMIT)
}

export function getTagSearchCandidateLimit(limit: number): number {
  return getSearchCandidateLimit(limit)
}

export function scoreTags(
  tags: Array<{ id: string; name: string; notes: string | null }>,
  query: string,
  limit = DEFAULT_SEARCH_LIMIT,
): TagSearchResult[] {
  return scoreSearchCandidates(tags, query, {
    getText: (tag) => tag.name,
    limit,
  }).map(({ candidate, score }) => ({ ...candidate, score }))
}
