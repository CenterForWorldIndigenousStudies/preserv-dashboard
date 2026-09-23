// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { ReprocessingDraftWorkspace, SUBMIT_LABEL } from '@organisms/ReprocessingDraftWorkspace'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

function buildDraft() {
  return {
    id: 'draft-1',
    name: 'Needs review corrections',
    collectionName: 'CWIS collection',
    collectionNotes: 'Metadata correction run.',
    restartStage: 'metadata_extractor' as const,
    requestedStages: ['metadata_extractor' as const],
    reason: 'Correct metadata after review.',
    documentCount: 1,
    createdAt: '2026-09-03T10:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z',
    createdBy: null,
    updatedBy: null,
    documents: [
      {
        id: 'document-1',
        name: 'Interview.pdf',
        idLegacy: 'legacy-1',
        sourceBatchId: 'source-batch-1',
        sourceBatchLegacyId: 'legacy-batch-1',
        sourceBatchName: 'Original ingest',
        addedAt: null,
      },
    ],
  }
}

describe('ReprocessingDraftWorkspace', () => {
  it('disables Save Draft until a draft field changes', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ReprocessingDraftWorkspace initialDraft={buildDraft()} />
      </ThemeProvider>,
    )
    const document = new DOMParser().parseFromString(markup, 'text/html')
    const saveButton = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Save draft'),
    )

    expect(saveButton).toBeDefined()
    expect(saveButton?.disabled).toBe(true)

    const submitButton = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.includes(SUBMIT_LABEL),
    )
    expect(submitButton?.disabled).toBe(false)
  })

  it('shows selected folders without an empty documents section', () => {
    const draft = buildDraft()
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ReprocessingDraftWorkspace
          initialDraft={{ ...draft, documents: [], documentCount: 0 }}
          selectedFolders={{ 'folder-1': { id: 'folder-1', name: 'Folder 1' } }}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Selected Folders')
    expect(markup).not.toContain('Documents in this draft')
  })

  it('shows documents without an empty selected folders section', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ReprocessingDraftWorkspace initialDraft={buildDraft()} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Documents in this draft')
    expect(markup).not.toContain('Selected Folders')
  })
})
