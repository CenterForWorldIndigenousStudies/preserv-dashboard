import { describe, it, expect } from 'vitest'
import { composeReviewQueueReasons, normalizeNeedsReviewValue } from '@lib/needsReview'

describe('normalizeNeedsReviewValue', () => {
  it('normalizes grouped service reasons with humanized pass labels', () => {
    expect(
      normalizeNeedsReviewValue({
        document_splitter_1: ['Ambiguous boundary between source pages 78 and 79 (logical boundary 136)'],
        ocr_processor: ['OCR output confidence is too low for metadata extraction.'],
      }),
    ).toEqual([
      {
        serviceKey: 'document_splitter_1',
        serviceLabel: 'Document Splitter Pass 1',
        reasons: ['Ambiguous boundary between source pages 78 and 79 (logical boundary 136)'],
      },
      {
        serviceKey: 'ocr_processor',
        serviceLabel: 'OCR Processor',
        reasons: ['OCR output confidence is too low for metadata extraction.'],
      },
    ])
  })

  it('normalizes the stored JSON metadata wrapper', () => {
    const storedValue = JSON.stringify({
      value: {
        document_splitter_1: ['Ambiguous boundary between source pages 78 and 79 (logical boundary 136)'],
      },
    })

    expect(normalizeNeedsReviewValue(storedValue)).toEqual([
      {
        serviceKey: 'document_splitter_1',
        serviceLabel: 'Document Splitter Pass 1',
        reasons: ['Ambiguous boundary between source pages 78 and 79 (logical boundary 136)'],
      },
    ])
  })

  it('preserves already-normalized reason groups', () => {
    const groups = [
      {
        serviceKey: 'document_splitter_1',
        serviceLabel: 'Document Splitter Pass 1',
        reasons: ['Boundary requires review.'],
      },
    ]

    expect(normalizeNeedsReviewValue(groups)).toEqual(groups)
  })

  it('normalizes legacy plain strings under Legacy', () => {
    expect(normalizeNeedsReviewValue('download failed')).toEqual([
      {
        serviceKey: 'legacy',
        serviceLabel: 'Legacy',
        reasons: ['download failed'],
      },
    ])
  })

  it('falls back to Legacy when the value is malformed', () => {
    expect(normalizeNeedsReviewValue({ unexpected: { nested: true } })).toEqual([
      {
        serviceKey: 'legacy',
        serviceLabel: 'Legacy',
        reasons: ['{\n  "unexpected": {\n    "nested": true\n  }\n}'],
      },
    ])
  })

  it('returns an empty list for null or blank values', () => {
    expect(normalizeNeedsReviewValue(null)).toEqual([])
    expect(normalizeNeedsReviewValue('   ')).toEqual([])
  })
})

describe('composeReviewQueueReasons', () => {
  it.each([
    ['NEEDS_REVIEW', 'Document requires human review.'],
    ['METADATA_ISSUES', 'Document has metadata issues.'],
    ['FORMAT_ERRORS', 'Document has format errors.'],
  ])('provides a fallback reason for %s', (validationStatus, reason) => {
    expect(composeReviewQueueReasons(null, validationStatus)).toEqual([
      {
        serviceKey: 'review_queue',
        serviceLabel: 'Review Queue',
        reasons: [reason],
      },
    ])
  })

  it('does not provide a fallback for unrelated statuses', () => {
    expect(composeReviewQueueReasons(null, 'APPROVED')).toEqual([])
  })

  it('preserves explicit reason groups instead of adding a fallback', () => {
    const groups = {
      document_splitter_1: ['Boundary requires review.'],
    }

    expect(composeReviewQueueReasons(groups, 'NEEDS_REVIEW')).toEqual([
      {
        serviceKey: 'document_splitter_1',
        serviceLabel: 'Document Splitter Pass 1',
        reasons: ['Boundary requires review.'],
      },
    ])
  })
})
