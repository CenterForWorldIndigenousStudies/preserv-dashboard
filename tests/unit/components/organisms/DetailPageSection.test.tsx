import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DetailPageSection } from '@organisms/DetailPageSection'

describe('DetailPageSection', () => {
  it('renders a titled section with optional description, actions, and content', () => {
    const markup = renderToStaticMarkup(
      <DetailPageSection title={'Batch Fields'} description={'Identity information'} actions={<button>Action</button>}>
        <span>Section content</span>
      </DetailPageSection>,
    )

    expect(markup).toContain('<section')
    expect(markup).toContain('Batch Fields')
    expect(markup).toContain('Identity information')
    expect(markup).toContain('Action')
    expect(markup).toContain('Section content')
  })
})
