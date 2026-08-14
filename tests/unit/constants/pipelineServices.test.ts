import { describe, expect, it } from 'vitest'

import contract from '@contracts/pipeline-services.json'
import {
  getPipelineServiceDisplayName,
  pipelineServiceDisplayNames,
  PIPELINE_SERVICES,
} from '@constants/pipelineServices'

describe('pipeline service contract', () => {
  it('exposes the generated service contract through the public facade', () => {
    expect(PIPELINE_SERVICES).toEqual(contract)
  })

  it('preserves display-name formatting for pass and unknown service keys', () => {
    expect(pipelineServiceDisplayNames.fedora_ingester).toBe('Fedora Ingester')
    expect(getPipelineServiceDisplayName('fedora_ingester_2')).toBe('Fedora Ingester Pass 2')
    expect(getPipelineServiceDisplayName('new_service')).toBe('New Service')
  })
})
