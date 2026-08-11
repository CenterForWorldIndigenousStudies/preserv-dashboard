import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ReviewQueueWorkspace } from '@root/app/review-queue/ReviewQueueWorkspace'

describe('ReviewQueueWorkspace', () => {
  it('renders only the review queue workspace', () => {
    const markup = renderToStaticMarkup(<ReviewQueueWorkspace needsReviewPanel={<div>Review queue table</div>} />)

    expect(markup).toContain('Review queue table')
    expect(markup).not.toContain('Ready for Library')
    expect(markup).not.toContain('role="tablist"')
  })
})
