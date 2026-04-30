import { describe, expect, it } from 'vitest'

import { scoreTags } from '@lib/tag-utils'

describe('scoreTags', () => {
  it('finds aboriginal with typo aborijinal', () => {
    const tags = [{ id: '1', name: 'aboriginal', notes: null }]

    const results = scoreTags(tags, 'aborijinal', 7)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.name).toBe('aboriginal')
  })

  it('matches exact and prefixed aboriginal tags ahead of looser matches', () => {
    const tags = [
      { id: '1', name: 'aboriginal', notes: null },
      { id: '2', name: 'aboriginal law', notes: null },
      { id: '3', name: 'law of aboriginal title', notes: null },
    ]

    const results = scoreTags(tags, 'aboriginal', 7)

    expect(results.map((tag) => tag.name)).toEqual([
      'aboriginal',
      'aboriginal law',
      'law of aboriginal title',
    ])
  })

  it('returns empty for garbled nonsense queries', () => {
    const tags = [
      { id: '1', name: 'aboriginal', notes: null },
      { id: '2', name: 'treaty rights', notes: null },
    ]

    const results = scoreTags(tags, '!!!@@@###$$$', 7)

    expect(results).toEqual([])
  })

  it('keeps close trigram matches below exact matches', () => {
    const tags = [
      { id: '1', name: 'abd', notes: null },
      { id: '2', name: 'abc', notes: null },
      { id: '3', name: 'xyz', notes: null },
    ]

    const results = scoreTags(tags, 'abd', 7)

    expect(results.map((tag) => tag.name)).toEqual(['abd', 'abc'])
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0)
  })

  it('sorts higher scores first', () => {
    const tags = [
      { id: '1', name: 'aboriginal', notes: null },
      { id: '2', name: 'aboriginal law', notes: null },
      { id: '3', name: 'law of aboriginal title', notes: null },
      { id: '4', name: 'xyz', notes: null },
    ]

    const results = scoreTags(tags, 'aboriginal', 7)

    expect(results.map((tag) => tag.name)).toEqual([
      'aboriginal',
      'aboriginal law',
      'law of aboriginal title',
    ])
    expect(results.every((tag, index, list) => index === 0 || list[index - 1].score >= tag.score)).toBe(true)
  })
})
