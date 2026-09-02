import { describe, expect, it } from 'vitest'

import { createPendingProcessStage, shouldShowPendingProcessStage } from '@lib/processStageStatus'
import { processPipelineConfig, createProcessBatch } from '@molecules/processStoryFixtures'

describe('process stage status helpers', () => {
  it('creates a pending stage with zeroed metrics and no timestamps', () => {
    const stage = createPendingProcessStage()

    expect(stage.status).toBe('pending')
    expect(stage.processedCount).toBe(0)
    expect(stage.startedAt).toBeNull()
    expect(stage.sourceFolderIds).toEqual([])
  })

  it('shows a pending stage when the service is requested but has no status yet', () => {
    const batch = createProcessBatch({ pipelineConfig: processPipelineConfig })

    expect(shouldShowPendingProcessStage(batch, batch.ocrProcessor, 'ocr-processor')).toBe(true)
    expect(
      shouldShowPendingProcessStage(
        { ...batch, ocrProcessor: createPendingProcessStage() },
        createPendingProcessStage(),
        'ocr-processor',
      ),
    ).toBe(false)
  })
})
