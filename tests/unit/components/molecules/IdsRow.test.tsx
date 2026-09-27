import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { IdsRow } from '@molecules/IdsRow'

describe('IdsRow', () => {
  it('does not render an additional identity when its value is absent', () => {
    const markup = renderToStaticMarkup(<IdsRow id={'12345678-90ab-cdef-1234-567890abcdef'} additionalId={null} />)

    expect(markup).not.toContain('Legacy ID')
  })

  it('renders an additional identity with its configured label', () => {
    const markup = renderToStaticMarkup(
      <IdsRow id={'12345678-90ab-cdef-1234-567890abcdef'} additionalId={'42'} additionalIdLabel={'Library ID'} />,
    )

    expect(markup).toContain('Library ID 42')
  })
})
