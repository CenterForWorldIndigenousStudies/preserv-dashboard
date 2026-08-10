import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { isExactBatchNameMatch, normalizeBatchNameForUniqueness, scoreBatchSearchCandidates } from '@lib/batchSearch'
import { buildBatchNameHash } from '@lib/batchNameHash'

describe('batchSearch', () => {
  it('ranks batch names with the shared fuzzy scorer', () => {
    const result = scoreBatchSearchCandidates(
      [
        { id: 'batch-special', name: 'Special RCR Writings September 25 2025' },
        { id: 'batch-other', name: 'Coastal Fisheries' },
      ],
      'Special RCR Writings sept 25 2025',
      7,
    )

    expect(result[0]).toMatchObject({ id: 'batch-special' })
    expect(result[0]?.score).toBeGreaterThan(0)
  })

  it('ignores batches without names and honors the result limit', () => {
    const result = scoreBatchSearchCandidates(
      [
        { id: 'batch-1', name: 'Spring Batch' },
        { id: 'batch-2', name: 'Spring Batch 2' },
        { id: 'batch-null', name: null },
      ],
      'spring',
      1,
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('batch-1')
  })

  it('recognizes exact batch names after trim and lowercase normalization', () => {
    expect(normalizeBatchNameForUniqueness('  Existing Batch  ')).toBe('existing batch')
    expect(isExactBatchNameMatch('Existing Batch', ' existing batch ')).toBe(true)
    expect(isExactBatchNameMatch('Existing Batch', 'Existing Batch 2')).toBe(false)
  })

  it('builds the same hash as the database uniqueness expression', () => {
    const expected = createHash('sha256').update('existing batch').digest('hex')

    expect(buildBatchNameHash(' Existing Batch ')).toBe(expected)
  })
})
