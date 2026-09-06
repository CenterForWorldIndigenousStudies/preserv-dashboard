import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DocumentReadinessDiagnostics } from '@organisms/DocumentReadinessDiagnostics'

describe('DocumentReadinessDiagnostics', () => {
  it('renders readiness diagnostics as reusable detail cards', () => {
    const markup = renderToStaticMarkup(
      <DocumentReadinessDiagnostics
        readiness={{
          approved: false,
          isPreservationCandidate: true,
          unmetRequirements: ['dc_subject'],
          reasonGroups: [],
        }}
      />,
    )

    expect(markup).toContain('Processing Diagnostics')
    expect(markup).toContain('Readiness outcome')
    expect(markup).toContain('Needs review')
    expect(markup).toContain('Preservation candidate')
    expect(markup).toContain('Unmet requirements')
    expect(markup).toContain('grid-template-columns:repeat(4, minmax(0, 1fr))')
  })
})
