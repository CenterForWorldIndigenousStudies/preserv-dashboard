import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MetadataTable } from '@molecules/MetadataTable'

describe('MetadataTable', () => {
  it('renders metadata values and notes through the shared table presentation', () => {
    const markup = renderToStaticMarkup(
      <MetadataTable
        fields={[
          {
            name: 'title',
            value: 'Document title',
            value_type: 'string',
            notes: 'The human-readable document title.',
          },
        ]}
      />,
    )

    expect(markup).toContain('Field')
    expect(markup).toContain('Value')
    expect(markup).toContain('title')
    expect(markup).toContain('Document title')
    expect(markup).toContain('aria-label="title: The human-readable document title."')
  })
})
