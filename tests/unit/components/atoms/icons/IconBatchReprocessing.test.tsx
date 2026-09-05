import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { IconBatchReprocessing } from '@atoms/icons/IconBatchReprocessing'

describe('IconBatchReprocessing', () => {
  it('renders the combined egg and shopping cart with the default icon contract', () => {
    const markup = renderToStaticMarkup(<IconBatchReprocessing />)

    expect(markup).toContain('width="24"')
    expect(markup).toContain('height="24"')
    expect(markup).toContain('viewBox="0 0 24 24"')
    expect(markup).toContain('fill="none"')
    expect(markup).toContain('fill="currentColor"')
    expect(markup).not.toContain('stroke="currentColor"')
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('focusable="false"')
    expect(markup).toContain('transform="translate(-4.3 -5.5) scale(1.4)"')
    expect(markup).toContain('fill-rule="evenodd"')
    expect(markup).toContain('clip-rule="evenodd"')
    expect(markup).toContain('M 14.086 4.172 L 13.627 4.077')
    expect(markup).toContain('M 16.019 18.354 L 16.249 18.373')
    expect(markup.match(/<path/g)).toHaveLength(1)
  })

  it('applies custom size, color, and className values', () => {
    const markup = renderToStaticMarkup(
      <IconBatchReprocessing size={32} color={'#8a4baf'} className={'batch-reprocessing-icon'} />,
    )

    expect(markup).toContain('width="32"')
    expect(markup).toContain('height="32"')
    expect(markup).toContain('fill="#8a4baf"')
    expect(markup).not.toContain('stroke="#8a4baf"')
    expect(markup).toContain('class="batch-reprocessing-icon"')
  })
})
