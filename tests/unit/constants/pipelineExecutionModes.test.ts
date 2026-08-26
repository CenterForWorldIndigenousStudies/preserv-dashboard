import { describe, expect, it } from 'vitest'

import contract from '@contracts/pipeline-execution-modes.json'
import { PIPELINE_EXECUTION_MODES } from '@constants/pipelineExecutionModes'

describe('pipeline execution mode contract', () => {
  it('matches the synced execution-mode contract', () => {
    expect(PIPELINE_EXECUTION_MODES).toEqual(contract)
  })

  it('exposes the stable serialized values', () => {
    expect(Object.values(PIPELINE_EXECUTION_MODES)).toEqual([
      'normal',
      'retry',
      'rerun',
      'reprocess',
    ])
  })
})
