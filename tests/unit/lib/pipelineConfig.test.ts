import { describe, expect, it } from 'vitest'

import { draftToPipelineConfig, type PipelineSelectionDraft } from '@lib/pipelineConfig'

function buildDraft(): PipelineSelectionDraft {
  return {
    profileId: 'custom',
    mode: 'custom',
    steps: {
      ingester: true,
      normalizePass1: {
        enabled: true,
        advancedOpen: false,
        subSelection: {
          split: true,
          rotate: true,
        },
      },
      normalizePass2: {
        enabled: false,
        advancedOpen: false,
        subSelection: {
          split: false,
          rotate: false,
        },
      },
      ocrProcessor: true,
      contentDedup: true,
      metadataExtraction: true,
      metadataValidation: false,
      rightsDeterminator: false,
      fedoraIngester: false,
    },
  }
}

describe('pipelineConfig', () => {
  it('chains OCR after the last normalize step and content dedup after OCR', () => {
    const config = draftToPipelineConfig(buildDraft())

    const ocrStep = config.executionPlan.find((step) => step.id === 'step-ocr-processor')
    const contentDedupStep = config.executionPlan.find((step) => step.id === 'step-content-dedup')
    const metadataExtractionStep = config.executionPlan.find((step) => step.id === 'step-metadata-extraction')

    expect(ocrStep?.dependsOn).toEqual(['step-normalize-pass-1-rotate'])
    expect(contentDedupStep?.dependsOn).toEqual(['step-ocr-processor'])
    expect(metadataExtractionStep?.dependsOn).toEqual(['step-content-dedup'])
  })
})
