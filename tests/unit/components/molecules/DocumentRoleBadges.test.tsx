import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DocumentRoleBadges } from '@molecules/DocumentRoleBadges'

describe('DocumentRoleBadges', () => {
  it('renders candidate above canonical in a vertically stacked group', () => {
    const markup = renderToStaticMarkup(<DocumentRoleBadges isCandidate isCanonical />)

    expect(markup).toContain('aria-label="Document roles"')
    expect(markup).toContain('Candidate')
    expect(markup).toContain('Canonical')
    expect(markup.indexOf('Candidate')).toBeLessThan(markup.indexOf('Canonical'))
  })

  it('renders nothing when the document has neither role', () => {
    expect(DocumentRoleBadges({ isCandidate: false, isCanonical: false })).toBeNull()
  })
})
