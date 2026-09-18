import { describe, expect, it } from 'vitest'

import {
  getDefaultReprocessingPipelineConfig,
  getReprocessingDownstreamStages,
  normalizeReprocessingRequestedStages,
  pipelineConfigToReprocessingRequestedStages,
} from '@lib/reprocessingDrafts'

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

  it('includes both normalization passes when reprocessing starts at document splitting', () => {
    const config = getDefaultReprocessingPipelineConfig('document_splitter')

    expect(config.executionPlan.filter((step) => step.stepId === 'normalize-pass-1').map((step) => step.pass)).toEqual([
      1,
      1,
    ])
    expect(config.executionPlan.filter((step) => step.stepId === 'normalize-pass-2').map((step) => step.pass)).toEqual([
      2,
      2,
    ])
    expect(pipelineConfigToReprocessingRequestedStages(config)).toEqual([
      'document_splitter',
      'page_rotator',
      'ocr_processor',
      'content_dedup',
      'metadata_extractor',
    ])
  })
})
