import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ProcessingTime } from '@atoms/ProcessingTime'

describe('ProcessingTime', () => {
  it('renders seconds with singular and plural units', () => {
    expect(renderToStaticMarkup(<ProcessingTime value={1} />)).toContain('1 second')
    expect(renderToStaticMarkup(<ProcessingTime value={42} />)).toContain('42 seconds')
  })
})
