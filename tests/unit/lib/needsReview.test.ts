import { describe, it, expect } from 'vitest'
import { normalizeNeedsReviewValue } from '@lib/needsReview'

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
