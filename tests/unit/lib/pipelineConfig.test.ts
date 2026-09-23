import { describe, expect, it } from 'vitest'

import {
  draftToPipelineConfig,
  parsePipelineConfig,
  pipelineConfigToDraft,
  type PipelineSelectionDraft,
} from '@lib/pipelineConfig'

function buildDraft(): PipelineSelectionDraft {
  return {
    profileId: 'custom',
    mode: 'custom',
    sourceFolderIds: [],
    sourceDocumentIds: [],
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
    },
  }
}

describe('pipelineConfig', () => {
  it.each(['rights-determinator', 'metadata-validation'])('drops retired stage %s from saved execution plans', (stage) => {
    const config = draftToPipelineConfig(buildDraft())
    const parsed = parsePipelineConfig({
      ...config,
      executionPlan: [
        ...config.executionPlan,
        {
          id: 'retired-stage',
          stepId: stage,
          service: stage,
          label: 'Retired stage',
          order: 9,
          enabled: true,
        },
      ],
    })
    expect(parsed?.executionPlan).toEqual(config.executionPlan)
  })

  it('chains OCR after the last normalize step and content dedup after OCR', () => {
    const config = draftToPipelineConfig(buildDraft())

    const ocrStep = config.executionPlan.find((step) => step.id === 'step-ocr-processor')
    const contentDedupStep = config.executionPlan.find((step) => step.id === 'step-content-dedup')
    const metadataExtractionStep = config.executionPlan.find((step) => step.id === 'step-metadata-extraction')

    expect(ocrStep?.dependsOn).toEqual(['step-normalize-pass-1-rotate'])
    expect(contentDedupStep?.dependsOn).toEqual(['step-ocr-processor'])
    expect(metadataExtractionStep?.dependsOn).toEqual(['step-content-dedup'])
    expect(config.executionPlan.some((step) => step.service === 'fedora_ingester')).toBe(false)
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

  it('persists source IDs alongside the complete execution plan', () => {
    const draft = buildDraft()
    draft.sourceFolderIds = ['folder-1']
    draft.sourceDocumentIds = ['document-1']

    const config = draftToPipelineConfig(draft)

    expect(config.sourceFolderIds).toEqual(['folder-1'])
    expect(config.sourceDocumentIds).toEqual(['document-1'])
    expect(config.executionPlan[0]).toMatchObject({
      id: 'step-ingester',
      service: 'data_ingester',
      enabled: true,
    })
    expect(config.executionPlan.length).toBeGreaterThan(1)
  })

  it('restores source IDs when loading a persisted pipeline config', () => {
    const config = draftToPipelineConfig({
      ...buildDraft(),
      sourceFolderIds: ['folder-1'],
      sourceDocumentIds: ['document-1'],
    })

    const restored = pipelineConfigToDraft(config)

    expect(restored.sourceFolderIds).toEqual(['folder-1'])
    expect(restored.sourceDocumentIds).toEqual(['document-1'])
  })

  it('parses and deduplicates persisted source IDs', () => {
    const parsed = parsePipelineConfig({
      profileId: 'custom',
      mode: 'custom',
      sourceFolderIds: ['folder-1', 'folder-1', ''],
      sourceDocumentIds: ['document-1', 'document-1'],
      executionPlan: [
        {
          id: 'step-ingester',
          stepId: 'data_ingester',
          service: 'data_ingester',
          label: 'Data Ingester',
          order: 0,
          enabled: true,
        },
      ],
    })

    expect(parsed?.sourceFolderIds).toEqual(['folder-1'])
    expect(parsed?.sourceDocumentIds).toEqual(['document-1'])
  })

  it('parses metadata extraction mode from persisted pipeline config', () => {
    const config = parsePipelineConfig({
      profileId: 'custom',
      mode: 'custom',
      metadataExtraction: { mode: 'openai_batch' },
      executionPlan: [
        {
          id: 'step-ingester',
          stepId: 'data_ingester',
          service: 'data_ingester',
          label: 'Data Ingester',
          order: 0,
          enabled: true,
        },
        {
          id: 'step-metadata-extraction',
          stepId: 'metadata_extractor',
          service: 'metadata_extractor',
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

  it('restores the shared configuration UX from a persisted pipeline config', () => {
    const draft = pipelineConfigToDraft(
      draftToPipelineConfig({
        ...buildDraft(),
        metadataExtraction: { mode: 'openai_batch' },
        steps: {
          ...buildDraft().steps,
          normalizePass1: {
            ...buildDraft().steps.normalizePass1,
            subSelection: { split: true, rotate: false },
          },
          normalizePass2: {
            ...buildDraft().steps.normalizePass2,
            enabled: true,
            subSelection: { split: true, rotate: true },
          },
        },
      }),
    )

    expect(draft.metadataExtraction.mode).toBe('openai_batch')
    expect(draft.steps.normalizePass1.subSelection).toEqual({ split: true, rotate: false })
    expect(draft.steps.normalizePass2.subSelection).toEqual({ split: true, rotate: true })
    expect(draft.steps.metadataExtraction).toBe(true)
  })
})
