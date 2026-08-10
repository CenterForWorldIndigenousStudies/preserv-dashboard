import { describe, expect, it } from 'vitest'

import { getSearchCandidateLimit, scoreSearchCandidates } from '@lib/fuzzySearch'

describe('scoreSearchCandidates', () => {
  it('scores arbitrary candidate data through a text accessor', () => {
    const candidates = [
      { id: 'batch-1', label: 'Special RCR Writings' },
      { id: 'batch-2', label: 'Coastal Fisheries' },
    ]

    const results = scoreSearchCandidates(candidates, 'Special RCR Writngs', {
      getText: (candidate) => candidate.label,
      limit: 7,
    })

    expect(results[0]).toMatchObject({ candidate: candidates[0] })
    expect(results[0]?.score).toBeGreaterThan(0)
  })

  it('ranks exact and prefixed candidates ahead of looser matches', () => {
    const candidates = ['aboriginal', 'aboriginal law', 'law of aboriginal title'].map((label) => ({ label }))

    const results = scoreSearchCandidates(candidates, 'aboriginal', {
      getText: (candidate) => candidate.label,
      limit: 7,
    })

    expect(results.map((result) => result.candidate.label)).toEqual([
      'aboriginal',
      'aboriginal law',
      'law of aboriginal title',
    ])
  })

  it('normalizes accents, whitespace, and punctuation before scoring', () => {
    const results = scoreSearchCandidates([{ label: 'Café—Collection' }], ' cafe collection ', {
      getText: (candidate) => candidate.label,
      limit: 7,
    })

    expect(results).toHaveLength(1)
  })

  it('returns no results for empty or unrelated queries', () => {
    const candidates = [{ label: 'aboriginal' }, { label: 'treaty rights' }]

    expect(scoreSearchCandidates(candidates, '   ', { getText: (candidate) => candidate.label })).toEqual([])
    expect(scoreSearchCandidates(candidates, '!!!@@@###$$$', { getText: (candidate) => candidate.label })).toEqual([])
  })

  it('applies the result limit and deterministic tie-breaking', () => {
    const candidates = [{ label: 'Beta' }, { label: 'Alpha' }, { label: 'Gamma' }]

    const results = scoreSearchCandidates(candidates, 'a', {
      getText: (candidate) => candidate.label,
      limit: 2,
    })

    expect(results).toHaveLength(2)
    expect(results.map((result) => result.candidate.label)).toEqual(['Alpha', 'Beta'])
  })
})

describe('getSearchCandidateLimit', () => {
  it('preserves the existing five-thousand candidate ceiling for a limit of twenty-five', () => {
    expect(getSearchCandidateLimit(25)).toBe(5000)
  })
})
