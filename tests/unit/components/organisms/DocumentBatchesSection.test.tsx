import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@organisms/DocumentBatchAssociations', () => ({
  DocumentBatchAssociations: () => <div>{'Document batch associations'}</div>,
}))

vi.mock('@organisms/DocumentReadinessDiagnostics', () => ({
  DocumentReadinessDiagnostics: () => <div>{'Processing Diagnostics'}</div>,
}))

import { DocumentBatchesSection } from '@organisms/DocumentBatchesSection'

describe('DocumentBatchesSection', () => {
  it('renders associations and processing diagnostics in the Batches section', () => {
    const markup = renderToStaticMarkup(
      <DocumentBatchesSection
        batchAssociations={[]}
        batchReturnHref={'/documents/document-1'}
        batchReturnLabel={'document Document One'}
        readiness={null}
        activeReviewReasons={[]}
        pipelineEvents={[]}
        pipelineBatchLinks={{}}
      />,
    )

    expect(markup).toContain('Batches')
    expect(markup).toContain('Document batch associations')
    expect(markup).toContain('Processing Diagnostics')
  })
})
