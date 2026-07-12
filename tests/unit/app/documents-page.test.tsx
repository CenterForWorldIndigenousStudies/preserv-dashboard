import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@lib/queries', () => ({
  getAllDocuments: vi.fn(),
  getDocumentFilterOptions: vi.fn(),
}))

vi.mock('@organisms/DocumentsTable', () => ({
  DocumentsTable: () => <div data-testid="documents-table">Documents table</div>,
}))

import DocumentsPage from '@root/app/documents/page'

describe('DocumentsPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the stable documents workspace framing', () => {
    const markup = renderToStaticMarkup(DocumentsPage({ searchParams: Promise.resolve({}) }))

    expect(markup).toContain('Documents')
    expect(markup).toContain(
      'Use this canonical browse and discovery workspace to search, filter, and open documents across the preservation system.',
    )
  })
})
