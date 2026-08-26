import { describe, expect, it } from 'vitest'

import { PIPELINE_EXECUTION_MODES } from '@constants/pipelineExecutionModes'
import { normalizePipelineExecutionContext } from '@lib/pipelineExecutionContext'

describe('normalizePipelineExecutionContext', () => {
  it('accepts pipeline configuration for an initial normal execution', () => {
    const pipelineConfig = {
      profileId: 'custom',
      mode: 'custom' as const,
      executionPlan: [],
    }

    const context = normalizePipelineExecutionContext('request-1', {
      executionMode: PIPELINE_EXECUTION_MODES.NORMAL,
      pipelineConfig,
    })

    expect(context.pipelineConfig).toEqual(pipelineConfig)
  })
})
