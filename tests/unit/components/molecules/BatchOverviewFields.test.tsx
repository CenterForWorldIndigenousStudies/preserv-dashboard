import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { BatchOverviewFields } from '@molecules/BatchOverviewFields'

describe('BatchOverviewFields', () => {
  it('renders the shared batch fields with their descriptions', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <BatchOverviewFields
          createdAt={'2026-09-01T10:00:00.000Z'}
          startedAt={'2026-09-05T10:00:00.000Z'}
          requestedStages={['ocr_processor']}
          lifecycleStatus={'running'}
          publicationStatus={'not_started'}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Created')
    expect(markup).toContain('Started')
    expect(markup).toContain('Requested Stage')
    expect(markup).toContain('Lifecycle')
    expect(markup).toContain('Publication')
    expect(markup).toContain('When the batch record was created.')
    expect(markup).toContain('When processing actually began.')
    expect(markup).toContain('ocr_processor')
  })

  it('shows drafts as not started and uses the fixed restart stage', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <BatchOverviewFields
          createdAt={'2026-09-01T10:00:00.000Z'}
          startedAt={null}
          requestedStages={['metadata_extractor']}
          lifecycleStatus={'draft'}
          publicationStatus={'not_started'}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Not started')
    expect(markup).toContain('metadata_extractor')
  })
})
