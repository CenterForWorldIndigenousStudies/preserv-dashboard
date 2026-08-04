import { describe, expect, it } from 'vitest'

import { createProcessStage } from '@molecules/processStoryFixtures'

describe('process story fixtures', () => {
  it('creates a normalized stage with null optional status fields by default', () => {
    const stage = createProcessStage()

    expect(stage.mode).toBeNull()
    expect(stage.openaiBatchWave1).toBeNull()
    expect(stage.openaiBatchWave2).toBeNull()
  })
})
