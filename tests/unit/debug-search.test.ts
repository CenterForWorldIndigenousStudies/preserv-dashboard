import { describe, expect, it } from 'vitest'

import { getTagSearchCandidateLimit, getTagSearchLimit, scoreTags } from '@lib/tag-utils'

describe('DEBUG: tag search scoring', () => {
  it('aborijinal should score aboriginal', () => {
    const tags = [
      { id: '1', name: 'aboriginal', notes: null },
      { id: '2', name: 'aboriginal law', notes: null },
      { id: '3', name: 'aboriginal rights', notes: null },
      { id: '4', name: 'treaty rights', notes: null },
    ]

    const limit = getTagSearchLimit(7)
    const candidateLimit = getTagSearchCandidateLimit(limit)
    console.log('[TEST] limits:', JSON.stringify({ limit, candidateLimit }))

    const results = scoreTags(tags, 'aborijinal', limit)
    console.log('[TEST] aborijinal results:', JSON.stringify(results))

    expect(results.length).toBeGreaterThan(0)
  })
})
