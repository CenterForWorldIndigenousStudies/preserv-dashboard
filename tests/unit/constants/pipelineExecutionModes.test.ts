import { describe, expect, it } from 'vitest'

import contract from '@contracts/pipeline-execution-modes.json'
import * as pipelineExecutionModes from '@constants/pipelineExecutionModes'
import { GENERATED_PIPELINE_EXECUTION_MODES } from '@constants/generated/pipelineExecutionModes'

describe('pipeline execution mode contract', () => {
  it('matches the synced execution-mode contract', () => {
    expect(GENERATED_PIPELINE_EXECUTION_MODES).toEqual(contract)
  })

  it('exposes the stable serialized values', () => {
    expect(Object.values(GENERATED_PIPELINE_EXECUTION_MODES)).toEqual(['normal', 'retry', 'rerun', 'reprocess'])
  })

  it('does not duplicate the generated runtime constant', () => {
    expect('PIPELINE_EXECUTION_MODES' in pipelineExecutionModes).toBe(false)
  })
})
