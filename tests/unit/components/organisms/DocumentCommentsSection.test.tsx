import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecules/MetadataTable', () => ({
  MetadataTable: ({ fields }: { fields: Array<{ displayName: string }> }) => (
    <div>{fields.map((field) => field.displayName).join('|')}</div>
  ),
}))

import { DocumentCommentsSection } from '@organisms/DocumentCommentsSection'
import type { DocumentDetail } from 'types/documents'

describe('DocumentCommentsSection', () => {
  it('always renders the complete comment field list', () => {
    const markup = renderToStaticMarkup(
      <DocumentCommentsSection metadata={[]} quality={null as DocumentDetail['quality']} />,
    )

    expect(markup).toContain('Comment')
    expect(markup).toContain('Additional Comment')
    expect(markup).toContain('Additional Comments')
    expect(markup).toContain('Control Comments')
    expect(markup).toContain('General Comments')
    expect(markup).toContain('Validation Comment')
    expect(markup).toContain('Additional Validation Comment')
  })
})
