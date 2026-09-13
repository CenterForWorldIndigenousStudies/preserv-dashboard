import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@organisms/DocumentVersionsButton', () => ({
  DocumentVersionsButton: () => <button type={'button'}>{'View Versions'}</button>,
}))

import { DocumentVersionsSection } from '@organisms/DocumentVersionsSection'
import type { DocumentDetail } from 'types/documents'

describe('DocumentVersionsSection', () => {
  it('renders version cards and the version-family action', () => {
    const markup = renderToStaticMarkup(
      <DocumentVersionsSection
        versionFamily={{ version_group_id: 'family-1', canonical_document_id: 'document-1', documents: [] }}
        versions={
          [
            {
              id: 'version-1',
              document_id: 'document-1',
              version_group_id: 'family-1',
              changes_summary: 'Updated metadata',
              notes: 'Version notes',
              similarity_score: 0.98,
              analyzed_at: null,
            },
          ] as DocumentDetail['versions']
        }
        returnHref={'/documents/document-1'}
        documentName={'Document One'}
      />,
    )

    expect(markup).toContain('Versions')
    expect(markup).toContain('View Versions')
    expect(markup).toContain('Version Group')
    expect(markup).toContain('Updated metadata')
  })

  it('renders the duplicate-family fallback when no version family exists', () => {
    const markup = renderToStaticMarkup(
      <DocumentVersionsSection
        versionFamily={null}
        versions={[]}
        returnHref={'/documents/document-1'}
        documentName={'Document One'}
        isDuplicate
      />,
    )

    expect(markup).toContain('related duplicate set is not available to display here yet')
  })
})
