import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { DocumentTableToolbar } from '@molecules/DocumentTableToolbar'

vi.mock('@molecules/DocumentTablePageSizeSelect', () => ({
  DocumentTablePageSizeSelect: () => null,
}))

describe('DocumentTableToolbar', () => {
  it('renders additional stats after the result count', () => {
    const markup = renderToStaticMarkup(
      <DocumentTableToolbar
        searchValue={''}
        onSearchChange={vi.fn()}
        pageSize={25}
        pageSizeOptions={[25]}
        onPageSizeChange={vi.fn()}
        totalCount={3}
        additionalStats={[{ label: 'documents', value: 12 }]}
      />,
    )

    expect(markup.indexOf('>results<')).toBeLessThan(markup.indexOf('>documents<'))
    expect(markup).toContain('12')
  })
})
