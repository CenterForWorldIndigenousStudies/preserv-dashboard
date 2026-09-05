import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  useBatchSearch: vi.fn(),
}))

vi.mock('@lib/hooks/useBatchSearch', () => ({
  useBatchSearch: mocks.useBatchSearch,
}))

import { ReviewQueueReprocessDialog } from '@organisms/ReviewQueueReprocessDialog'

const commonProps = {
  open: true,
  documentName: 'document-to-review.pdf',
  mode: 'create' as const,
  name: 'Retry metadata batch',
  collectionName: '',
  collectionNotes: '',
  restartStage: 'metadata_extractor' as const,
  reason: 'Correct metadata',
  drafts: [],
  selectedDraftId: null,
  pending: false,
  canCreate: true,
  onClose: vi.fn(),
  onModeChange: vi.fn(),
  onNameChange: vi.fn(),
  onCollectionNameChange: vi.fn(),
  onCollectionNotesChange: vi.fn(),
  onRestartStageChange: vi.fn(),
  onReasonChange: vi.fn(),
  onSelectedDraftChange: vi.fn(),
  onSubmit: vi.fn(),
}

describe('ReviewQueueReprocessDialog', () => {
  beforeEach(() => {
    mocks.useBatchSearch.mockReturnValue({
      suggestions: [],
      exactMatch: null,
      isLoading: false,
      error: null,
    })
  })

  it('renders the create-draft form for the selected document', () => {
    const markup = renderToStaticMarkup(<ReviewQueueReprocessDialog {...commonProps} />)

    expect(markup).toContain('Add document to a reprocessing batch')
    expect(markup).toContain('document-to-review.pdf')
    expect(markup).toContain('Create a reprocessing batch for')
    expect(markup).toContain('Create a reprocessing batch')
    expect(markup).toContain('Create draft')
    expect(markup).not.toContain('Choose how to reprocess')
    expect(markup).not.toContain('Add to existing draft')
    expect(markup).not.toContain('role="tablist"')
  })

  it('renders the existing-draft picker and add action', () => {
    const markup = renderToStaticMarkup(
      <ReviewQueueReprocessDialog
        {...commonProps}
        mode={'existing'}
        drafts={[
          {
            id: 'draft-1',
            name: 'Existing retry batch',
            collectionName: null,
            collectionNotes: null,
            restartStage: 'metadata_extractor',
            reason: 'Retry metadata',
            documentCount: 2,
            createdAt: null,
            updatedAt: null,
            createdBy: null,
            updatedBy: null,
          },
        ]}
      />,
    )

    expect(markup).toContain('Existing reprocessing batch')
    expect(markup).toContain('Add document')
    expect(markup).toContain('role="tablist"')
    expect(markup).toContain('role="tab"')
  })

  it('shows an inline warning when the new draft name already exists', () => {
    mocks.useBatchSearch.mockReturnValue({
      suggestions: [],
      exactMatch: { id: 'batch-1', name: 'Retry metadata batch', score: 100 },
      isLoading: false,
      error: null,
    })

    const markup = renderToStaticMarkup(<ReviewQueueReprocessDialog {...commonProps} />)

    expect(markup).toContain('A batch with this name already exists. Choose a different name.')
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Create draft<\/button>/)
  })
})
