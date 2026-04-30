import type { Prisma } from '@lib/prisma/generated/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@lib/db'
import { scoreTags, type TagSearchResult } from '@lib/tag-utils'
import { resetTestDatabase } from '../support/test-db'
import { withRollbackTransaction } from '../support/transaction'

describe('tag search (integration)', () => {
  beforeAll(async () => {
    await resetTestDatabase()
    await db.$connect()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  const makeTagId = (index: number): string => `tag-${index.toString().padStart(32, '0')}`

  const seedManyTags = async (tx: Prisma.TransactionClient, count: number): Promise<void> => {
    const generatedTags = Array.from({ length: count }, (_, index) => {
      const letterIndex = index % 26
      const bucket = Math.floor(index / 26)
      const leading = String.fromCharCode(97 + letterIndex)
      const trailing = String.fromCharCode(97 + ((bucket + letterIndex) % 26))
      const family = bucket.toString().padStart(3, '0')

      return {
        id: makeTagId(index),
        name: `${leading}${trailing}${family}`,
      }
    })

    const specificNames = [
      'a',
      'aaa',
      'aaaa',
      'aaab',
      'aaac',
      'aboriginal',
      'aboriginal governance',
      'aboriginal law',
      'aboriginal rights',
      'aboriginal title',
      'abortion',
      'canada',
      'indigenous jurisprudence',
      'mediumlength',
      'thirty-character-tag-name-example',
      'Yale',
      'Yalapa traditions',
      'Yarrow',
      'Yelapa',
      'Yelapa fishing community',
      'yellow cedar',
      'youth council',
      'yelping coyote',
      'zapotec',
      'zoology',
      'zooplankton',
      'zzzz-endpoint',
    ]

    const specificTags = specificNames.map((name, offset) => ({
      id: makeTagId(count + offset),
      name,
    }))

    await tx.tags.createMany({
      data: [...generatedTags, ...specificTags],
      skipDuplicates: true,
    })
  }

  const fetchCandidates = async (tx: Prisma.TransactionClient): Promise<Array<{ id: string; name: string; notes: string | null }>> =>
    tx.tags.findMany({
      select: {
        id: true,
        name: true,
        notes: true,
      },
      orderBy: { name: 'asc' },
    })

  const search = async (tx: Prisma.TransactionClient, query: string, limit = 7): Promise<TagSearchResult[]> => {
    const candidates = await fetchCandidates(tx)
    return scoreTags(candidates, query, limit)
  }

  it('finds exact prefix matches for aboriginal terms', async () => {
    await withRollbackTransaction(async (tx) => {
      await seedManyTags(tx, 520)

      const results = await search(tx, 'aboriginal', 7)
      const resultNames = results.map((result) => result.name)

      expect(results[0]?.name).toBe('aboriginal')
      expect(resultNames).toContain('aboriginal law')
      expect(resultNames).toContain('aboriginal title')
      expect(resultNames).toContain('aboriginal rights')
    })
  })

  it('matches a short prefix across multiple aboriginal tags', async () => {
    await withRollbackTransaction(async (tx) => {
      await seedManyTags(tx, 520)

      const results = await search(tx, 'aborig', 10)
      const resultNames = results.map((result) => result.name)

      expect(resultNames).toContain('aboriginal')
      expect(resultNames).toContain('aboriginal law')
      expect(resultNames).toContain('aboriginal title')
      expect(resultNames).toContain('aboriginal rights')
    })
  })

  it('finds aboriginal with the typo aborijinal', async () => {
    await withRollbackTransaction(async (tx) => {
      await seedManyTags(tx, 520)

      const results = await search(tx, 'aborijinal', 7)

      expect(results.some((result) => result.name === 'aboriginal')).toBe(true)
    })
  })

  it('matches abortion from the short query aba', async () => {
    await withRollbackTransaction(async (tx) => {
      await seedManyTags(tx, 520)

      const results = await search(tx, 'aba', 20)

      expect(results.some((result) => result.name === 'abortion')).toBe(true)
    })
  })

  it('finds Yelapa among late-alphabet tags', async () => {
    await withRollbackTransaction(async (tx) => {
      await seedManyTags(tx, 520)

      const results = await search(tx, 'Yelapa', 7)

      expect(results.some((result) => result.name === 'Yelapa')).toBe(true)
      expect(results[0]?.name).toBe('Yelapa')
    })
  })

  it('finds Yelapa with the typo Yalaba', async () => {
    await withRollbackTransaction(async (tx) => {
      await seedManyTags(tx, 520)

      const results = await search(tx, 'Yalaba', 10)

      expect(results.some((result) => result.name === 'Yelapa')).toBe(true)
    })
  })

  it('finds Yelapa with missing characters in Yalap', async () => {
    await withRollbackTransaction(async (tx) => {
      await seedManyTags(tx, 520)

      const results = await search(tx, 'Yalap', 10)

      expect(results.some((result) => result.name === 'Yelapa')).toBe(true)
    })
  })

  it('orders results by score descending', async () => {
    await withRollbackTransaction(async (tx) => {
      await seedManyTags(tx, 520)

      const results = await search(tx, 'aboriginal', 10)

      for (let index = 1; index < results.length; index += 1) {
        expect(results[index - 1].score).toBeGreaterThanOrEqual(results[index].score)
      }
    })
  })

  it('returns an empty result set for unrelated queries', async () => {
    await withRollbackTransaction(async (tx) => {
      await seedManyTags(tx, 520)

      const results = await search(tx, '@@@###', 10)

      expect(results).toEqual([])
    })
  })

  it('reaches tags across the full alphabet', async () => {
    await withRollbackTransaction(async (tx) => {
      await seedManyTags(tx, 520)

      const earlyResults = await search(tx, 'aaa', 10)
      const middleResults = await search(tx, 'canada', 10)
      const lateResults = await search(tx, 'zapotec', 10)

      expect(earlyResults.some((result) => result.name === 'aaa')).toBe(true)
      expect(middleResults.some((result) => result.name === 'canada')).toBe(true)
      expect(lateResults.some((result) => result.name === 'zapotec')).toBe(true)
    })
  })
})
