import { describe, expect, it } from 'vitest'

import { db } from '@lib/db'
import { getTagSearchCandidateLimit, getTagSearchLimit, scoreTags } from '@lib/tag-utils'

describe('DEBUG: tag search against test DB', () => {
  it('logs candidate coverage for aborijinal', async () => {
    const limit = getTagSearchLimit(7)
    const candidates = await db.tags.findMany({
      orderBy: { name: 'asc' },
      take: getTagSearchCandidateLimit(limit),
      select: {
        id: true,
        name: true,
        notes: true,
      },
    })

    const scored = scoreTags(candidates, 'aborijinal', limit)
    const hasAboriginal = candidates.some((tag) => tag.name.toLowerCase().includes('aboriginal'))

    console.log('[TEST-DB] candidateCount=', candidates.length)
    console.log('[TEST-DB] first20=', candidates.slice(0, 20).map((tag) => tag.name))
    console.log('[TEST-DB] hasAboriginal=', hasAboriginal)
    console.log('[TEST-DB] scored=', JSON.stringify(scored))

    expect(candidates.length).toBeGreaterThan(0)
    expect(scored.length).toBeGreaterThan(0)
  })
})
