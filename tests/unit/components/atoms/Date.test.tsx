import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { DateAtom } from '@atoms/Date'

describe('DateAtom', () => {
  it('renders a dash for nullish and invalid values', () => {
    expect(renderToStaticMarkup(<DateAtom value={null} />)).toContain('>-<')
    expect(renderToStaticMarkup(<DateAtom value={undefined} />)).toContain('>-<')
    expect(renderToStaticMarkup(<DateAtom value="not-a-date" />)).toContain('>-<')
  })

  it('renders a deterministic first-pass display for Date values', () => {
    const markup = renderToStaticMarkup(<DateAtom value={new Date('2026-05-29T18:56:45.000Z')} />)

    expect(markup).toContain('>2026-05-29 18:56 UTC<')
  })

  it('uses an ISO raw title for Date values instead of Date.toString output', () => {
    const markup = renderToStaticMarkup(<DateAtom value={new Date('2026-05-29T18:56:45.000Z')} />)

    expect(markup).toContain('title="Raw: 2026-05-29T18:56:45.000Z"')
    expect(markup).not.toContain('GMT')
  })

  it('keeps deterministic partial-date formatting for ISO strings', () => {
    expect(renderToStaticMarkup(<DateAtom value="2026" />)).toContain('>2026<')
    expect(renderToStaticMarkup(<DateAtom value="2026-05" />)).toContain('>May 2026<')
    expect(renderToStaticMarkup(<DateAtom value="2026-05-29" />)).toContain('>2026-05-29<')
  })
})
