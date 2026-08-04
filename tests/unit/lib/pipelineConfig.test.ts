import { describe, expect, it } from 'vitest'

import { draftToPipelineConfig, parsePipelineConfig, type PipelineSelectionDraft } from '@lib/pipelineConfig'

function buildDraft(): PipelineSelectionDraft {
  return {
    profileId: 'custom',
    mode: 'custom',
    metadataExtraction: {
      mode: 'direct',
    },
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
    expect(config.executionPlan.some((step) => step.service === 'fedora-ingester')).toBe(false)
  })

  it('persists metadata extraction mode in pipeline config', () => {
    const draft = buildDraft()
    draft.metadataExtraction = { mode: 'openai_batch' }

    const config = draftToPipelineConfig(draft) as unknown as {
      metadataExtraction: {
        mode: string
      }
    }

    expect(config.metadataExtraction.mode).toBe('openai_batch')
  })

  it('parses metadata extraction mode from persisted pipeline config', () => {
    const config = parsePipelineConfig({
      profileId: 'custom',
      mode: 'custom',
      metadataExtraction: { mode: 'openai_batch' },
      executionPlan: [
        {
          id: 'step-ingester',
          stepId: 'ingester',
          service: 'ingester',
          label: 'Ingest',
          order: 0,
          enabled: true,
        },
        {
          id: 'step-metadata-extraction',
          stepId: 'metadata-extraction',
          service: 'metadata-extraction',
          label: 'Metadata Extraction',
          order: 1,
          enabled: true,
        },
      ],
    }) as unknown as {
      metadataExtraction: {
        mode: string
      }
    } | null

    expect(config?.metadataExtraction.mode).toBe('openai_batch')
  })
})
