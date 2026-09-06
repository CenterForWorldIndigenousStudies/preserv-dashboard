import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Cost } from '@atoms/Cost'

describe('Cost', () => {
  it('formats a numeric value using the dashboard currency format', () => {
    const markup = renderToStaticMarkup(<Cost value={0.127778} />)

    expect(markup).toContain('$0.127778')
  })

  it('preserves the dashboard currency format for an already formatted value', () => {
    const markup = renderToStaticMarkup(<Cost value={'$12.50'} />)

    expect(markup).toContain('$12.50')
  })

  it('renders a dash when the cost is missing', () => {
    const markup = renderToStaticMarkup(<Cost value={null} />)

    expect(markup).toContain('—')
  })
})
