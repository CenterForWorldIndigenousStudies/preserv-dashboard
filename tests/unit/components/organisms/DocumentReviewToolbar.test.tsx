import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { buildDefaultReviewQueueChecklistState } from '@constants/reviewQueueChecklist'
import { DocumentReviewToolbar } from '@organisms/DocumentReviewToolbar'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@molecules/SelectionActionsButton', () => ({
  SelectionActionsButton: ({
    actions,
    selectedCount,
  }: {
    actions: Array<{ label: string }>
    selectedCount: number
  }) => (
    <div data-testid={'document-actions'}>
      {`Actions (${selectedCount})`}
      {actions.map((action) => (
        <span key={action.label}>{action.label}</span>
      ))}
    </div>
  ),
}))

vi.mock('@organisms/ReadyForLibraryPublishDialog', () => ({
  ReadyForLibraryPublishDialog: () => null,
}))

vi.mock('@organisms/LibraryRemovalActions', () => ({
  LibraryRemovalActions: () => null,
}))

vi.mock('@molecules/PipelineExecutionDialog', () => ({
  PipelineExecutionDialog: () => null,
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

  it.each([
    { actionMode: 'ready', expected: ['Publish', 'Reprocess'] },
    { actionMode: 'published', expected: ['Remove', 'Reprocess'] },
  ] as const)('shows $actionMode actions for a document', ({ actionMode, expected }) => {
    const markup = renderToStaticMarkup(
      <DocumentReviewToolbar
        documentId={'doc-3'}
        documentName={'Document Three'}
        actionMode={actionMode}
        validationStatus={'APPROVED'}
        isCandidate
        isCanonical
        hasOpenReprocessingDraft={false}
        initialDrafts={[]}
      />,
    )

    const actions = markup.match(/<div data-testid="document-actions">(.*?)<\/div>/)?.[1]
    expect(actions).toBeDefined()
    for (const label of expected) expect(actions).toContain(label)
    for (const label of ['Approve', 'Reject', 'Publish', 'Remove']) {
      if (!expected.some((item) => item === label)) expect(actions).not.toContain(label)
    }
    if (actionMode === 'published') {
      expect(markup).toContain('>Published</')
      expect(markup).not.toContain('>Approved</')
    } else {
      expect(markup).toContain('>Approved</')
    }
  })
})
