import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { IconGoogle } from '@atoms/icons/IconGoogle'

describe('IconGoogle', () => {
  it('uses a 20px default size and scales to a custom size', () => {
    const defaultMarkup = renderToStaticMarkup(<IconGoogle />)
    const customMarkup = renderToStaticMarkup(<IconGoogle size={32} className={'provider-icon'} />)

    expect(defaultMarkup).toContain('width="20"')
    expect(defaultMarkup).toContain('height="20"')
    expect(defaultMarkup).toContain('viewBox="0 0 24 24"')
    expect(defaultMarkup).toContain('aria-hidden="true"')
    expect(customMarkup).toContain('width="32"')
    expect(customMarkup).toContain('height="32"')
    expect(customMarkup).toContain('class="provider-icon"')
    expect(customMarkup.match(/<path/g)).toHaveLength(4)
  })
})
