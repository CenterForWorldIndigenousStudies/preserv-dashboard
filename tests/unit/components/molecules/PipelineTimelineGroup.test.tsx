import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { PipelineTimelineGroup } from '@molecules/PipelineTimelineGroup'

describe('PipelineTimelineGroup', () => {
  it('renders warning text for completed steps with review items', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <PipelineTimelineGroup
          isLast
          step={{
            label: 'OCR Processor',
            status: 'completed',
            warningText: '2 documents need review',
          }}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Done')
    expect(markup).toContain('2 documents need review')
  })
})
