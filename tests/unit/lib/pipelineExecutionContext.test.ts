import { describe, expect, it } from 'vitest'

import { PIPELINE_EXECUTION_MODES } from '@constants/pipelineExecutionModes'
import { normalizePipelineExecutionContext } from '@lib/pipelineExecutionContext'

describe('normalizePipelineExecutionContext', () => {
  it('accepts pipeline configuration for an initial normal execution', () => {
    const pipelineConfig = {
      profileId: 'custom' as const,
      mode: 'custom' as const,
      metadataExtraction: { mode: 'direct' as const },
      executionPlan: [],
    }

    const context = normalizePipelineExecutionContext('request-1', {
      executionMode: PIPELINE_EXECUTION_MODES.NORMAL,
      pipelineConfig,
    })

    expect(context.pipelineConfig).toEqual(pipelineConfig)
  })

  it('accepts a draft batch as the target of reprocessing without a new name', () => {
    const context = normalizePipelineExecutionContext('request-1', {
      executionMode: PIPELINE_EXECUTION_MODES.REPROCESS,
      operationId: 'operation-1',
      idempotencyKey: 'idempotency-1',
      draftBatchId: ' draft-1 ',
      reason: 'Retry selected documents',
    })

    expect(context.draftBatchId).toBe('draft-1')
    expect(context.newBatchName).toBeUndefined()
  })

  it('normalizes collection metadata for a draft submission', () => {
    const context = normalizePipelineExecutionContext('request-1', {
      executionMode: PIPELINE_EXECUTION_MODES.REPROCESS,
      operationId: 'operation-1',
      idempotencyKey: 'idempotency-1',
      draftBatchId: 'draft-1',
      reason: 'Retry selected documents',
      collection: { name: ' Collection A ', notes: ' Review set ' },
    })

    expect(context.collection).toEqual({ name: 'Collection A', notes: 'Review set' })
  })
})
