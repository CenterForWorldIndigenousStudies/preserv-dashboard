import { describe, expect, it } from 'vitest'

import { humanizeMetadataName } from '@lib/strings'

describe('humanizeMetadataName', () => {
  it('converts snake case names to title case', () => {
    expect(humanizeMetadataName('content_hash_algorithm')).toBe('Content Hash Algorithm')
  })

  it('preserves known metadata acronyms', () => {
    expect(humanizeMetadataName('dc_ocr_source_document_id')).toBe('DC OCR Source Document ID')
  })

  it('ignores empty segments created by repeated underscores', () => {
    expect(humanizeMetadataName('_document__title_')).toBe('Document Title')
  })

  it('returns an empty label when no name segments are provided', () => {
    expect(humanizeMetadataName('___')).toBe('')
  })
})
