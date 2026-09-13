import { describe, expect, it } from 'vitest'

import contract from '@contracts/pipeline-services.json'
import * as pipelineServices from '@constants/pipelineServices'
import { GENERATED_PIPELINE_SERVICES } from '@constants/generated/pipelineServices'
import { getPipelineServiceDisplayName, pipelineServiceDisplayNames } from '@constants/pipelineServices'

describe('pipeline service contract', () => {
  it('matches the synced service contract', () => {
    expect(GENERATED_PIPELINE_SERVICES).toEqual(contract)
  })

  it('does not duplicate the generated runtime constant', () => {
    expect('PIPELINE_SERVICES' in pipelineServices).toBe(false)
  })

  it('preserves display-name formatting for pass and unknown service keys', () => {
    expect(pipelineServiceDisplayNames.fedora_ingester).toBe('Fedora Ingester')
    expect(getPipelineServiceDisplayName('fedora_ingester_2')).toBe('Fedora Ingester Pass 2')
    expect(getPipelineServiceDisplayName('new_service')).toBe('New Service')
  })
})
