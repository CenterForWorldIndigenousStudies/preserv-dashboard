import { describe, expect, it } from 'vitest'

import {
  DEFAULT_REPROCESSING_START_STAGE,
  getReprocessingDownstreamStages,
  getReprocessingStageLabel,
} from '@lib/reprocessingDrafts'

describe('reprocessing draft helpers', () => {
  it('uses OCR Processor as the default start stage for new drafts', () => {
    expect(DEFAULT_REPROCESSING_START_STAGE).toBe('ocr_processor')
  })

  it('returns the selected stage and every downstream execution stage', () => {
    expect(getReprocessingDownstreamStages('metadata_extractor')).toEqual([
      'metadata_extractor',
      'metadata_validator',
      'rights_determinator',
      'fedora_ingester',
    ])
  })

  it('returns an empty list for a stage that cannot start reprocessing', () => {
    expect(getReprocessingDownstreamStages('ingester')).toEqual([])
  })

  it('provides the display label for the terminal stage', () => {
    expect(getReprocessingStageLabel('fedora_ingester')).toBe('Fedora Ingester')
  })
})
