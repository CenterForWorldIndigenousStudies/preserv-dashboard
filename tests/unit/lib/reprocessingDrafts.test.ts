import { describe, expect, it } from 'vitest'

import { getReprocessingDownstreamStages, normalizeReprocessingRequestedStages } from '@lib/reprocessingDrafts'

describe('reprocessing stage plans', () => {
  it('returns the ordered stages from the selected restart stage', () => {
    expect(getReprocessingDownstreamStages('ocr_processor')).toEqual([
      'ocr_processor',
      'content_dedup',
      'metadata_extractor',
    ])
  })

  it('accepts a contiguous subset beginning with the restart stage', () => {
    expect(normalizeReprocessingRequestedStages('ocr_processor', ['ocr_processor', 'content_dedup'])).toEqual([
      'ocr_processor',
      'content_dedup',
    ])
  })

  it('rejects a plan with skipped downstream stages', () => {
    expect(normalizeReprocessingRequestedStages('ocr_processor', ['ocr_processor', 'metadata_extractor'])).toEqual([])
  })
})
