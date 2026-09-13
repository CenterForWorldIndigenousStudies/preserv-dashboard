import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DocumentRelationshipEditor } from '@molecules/DocumentRelationshipEditor'

describe('DocumentRelationshipEditor', () => {
  it('shows contributor role and type and publisher notes', () => {
    const markup = renderToStaticMarkup(
      <DocumentRelationshipEditor
        contributors={[{ contributorId: 'contributor-1', name: 'Ada Example', role: 'author', type: 'primary', notes: 'Note' }]}
        publishers={[{ publisherId: 'publisher-1', name: 'Example Press', notes: 'Publisher note' }]}
        onContributorsChange={() => undefined}
        onPublishersChange={() => undefined}
      />,
    )

    expect(markup).toContain('Ada Example')
    expect(markup).toContain('primary')
    expect(markup).toContain('Example Press')
    expect(markup).toContain('Publisher note')
  })
})
