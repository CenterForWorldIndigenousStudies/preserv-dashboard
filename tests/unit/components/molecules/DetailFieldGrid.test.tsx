import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DetailFieldGrid } from '@molecules/DetailFieldGrid'

describe('DetailFieldGrid', () => {
  it('renders labeled detail fields with React-node values', () => {
    const markup = renderToStaticMarkup(
      <DetailFieldGrid
        fields={[
          { key: 'id', label: 'Batch ID', value: 'batch-1' },
          { key: 'started', label: 'Started At', value: <time>July 9</time> },
        ]}
      />,
    )

    expect(markup).toContain('Batch ID')
    expect(markup).toContain('batch-1')
    expect(markup).toContain('Started At')
    expect(markup).toContain('<time>July 9</time>')
    expect(markup).toContain('<dt')
    expect(markup).toContain('<dd')
  })
})
