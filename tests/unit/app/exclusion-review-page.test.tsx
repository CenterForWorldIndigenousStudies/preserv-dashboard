import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@organisms/ExclusionReviewWorkspace', () => ({
  ExclusionReviewWorkspace: () => <div>Exclusion review workspace stub</div>,
}))

import ExclusionReviewPage from '@root/app/exclusion-review/page'

describe('ExclusionReviewPage', () => {
  it('frames exclusion review as a full-width human review workspace', () => {
    const markup = renderToStaticMarkup(ExclusionReviewPage())

    expect(markup).toContain('Exclusion Review')
    expect(markup).toContain(
      'Browse one configured Google Drive root and record include or exclude review decisions.',
    )
    expect(markup).toContain('Exclusion review workspace stub')
  })
})
