import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { buildDefaultReviewQueueChecklistState } from '@constants/reviewQueueChecklist'
import { DocumentReviewToolbar } from '@organisms/DocumentReviewToolbar'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

describe('DocumentReviewToolbar', () => {
  it('renders the review queue controls for the current document', () => {
    const markup = renderToStaticMarkup(
      <DocumentReviewToolbar
        documentId={'doc-1'}
        documentName={'Document One'}
        validationStatus={'NEEDS_REVIEW'}
        reviewReasons={[
          {
            serviceKey: 'metadata_extractor',
            serviceLabel: 'Metadata Extractor',
            reasons: ['Missing rights statement.'],
          },
        ]}
        reviewChecklist={buildDefaultReviewQueueChecklistState()}
        isCandidate
        isCanonical
        hasOpenReprocessingDraft
        initialDrafts={[]}
      />,
    )

    expect(markup).toContain('Needs Review')
    expect(markup).toContain('Candidate')
    expect(markup).toContain('Canonical')
    expect(markup).toContain('Checklist')
    expect(markup).toContain('Actions (1)')
    expect(markup).not.toContain('Review Details')
    expect(markup.indexOf('Candidate')).toBeLessThan(markup.indexOf('Canonical'))
    expect(markup.indexOf('Canonical')).toBeLessThan(markup.indexOf('Actions (1)'))
    expect(markup.indexOf('Actions (1)')).toBeLessThan(markup.indexOf('Needs Review'))
    expect(markup.indexOf('Needs Review')).toBeLessThan(markup.indexOf('Checklist'))
  })

  it('does not render document role badges when neither role applies', () => {
    const markup = renderToStaticMarkup(
      <DocumentReviewToolbar
        documentId={'doc-2'}
        documentName={'Document Two'}
        reviewChecklist={buildDefaultReviewQueueChecklistState()}
        isCandidate={false}
        isCanonical={false}
        hasOpenReprocessingDraft={false}
        initialDrafts={[]}
      />,
    )

    expect(markup).not.toContain('Candidate')
    expect(markup).not.toContain('Canonical')
  })
})
