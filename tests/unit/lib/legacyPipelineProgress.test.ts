import { describe, expect, it } from 'vitest'

import { buildLegacyPipelineSteps } from '@lib/legacyPipelineProgress'
import { createProcessBatch } from '@molecules/processStoryFixtures'

describe('buildLegacyPipelineSteps', () => {
  it('shows historical processing complete and unpublished Fedora work as pending', () => {
    const steps = buildLegacyPipelineSteps(
      createProcessBatch({
        pipelineExecutionMode: 'legacy_import',
        legacyImportStatus: 'historical',
        publicationStatus: 'not_started',
      }),
    )

    expect(steps).toEqual([
      { label: 'Legacy processing', status: 'completed' },
      { label: 'Fedora Ingester', status: 'pending' },
    ])
  })

  it('maps published legacy batches to completed publication progress', () => {
    const steps = buildLegacyPipelineSteps(
      createProcessBatch({
        pipelineExecutionMode: 'legacy_import',
        legacyImportStatus: 'historical',
        publicationStatus: 'published',
      }),
    )

    expect(steps[1]).toEqual({ label: 'Fedora Ingester', status: 'completed' })
  })
})
