import { describe, expect, it } from 'vitest'

import { getProcessingDetailsPropertyDefinition } from '@lib/processingDetails'

describe('processingDetails', () => {
  it('returns the contract label and description for a batch property', () => {
    expect(getProcessingDetailsPropertyDefinition('legacyImport')).toEqual({
      label: 'Legacy Import',
      description: 'Historical data-combiner processing and registry metrics.',
      valueType: 'object',
    })
  })

  it('returns a shared stage definition for nested properties', () => {
    expect(getProcessingDetailsPropertyDefinition('startedAt')).toEqual({
      label: 'Started At',
      description: 'Unix timestamp in seconds when this stage began processing.',
      valueType: 'unixTimestamp',
    })
  })

  it('gets stage-entry labels from the pipeline-services contract', () => {
    expect(getProcessingDetailsPropertyDefinition('documentSplitterPass1')).toEqual({
      label: 'Document Splitter Pass 1',
      description: 'Status and metrics recorded for one pipeline service stage.',
      valueType: 'object',
    })
  })

  it('returns null for an unregistered property', () => {
    expect(getProcessingDetailsPropertyDefinition('unknown_property')).toBeNull()
  })
})
