// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { ReprocessingDraftWorkspace, SUBMIT_LABEL } from '@organisms/ReprocessingDraftWorkspace'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

vi.mock('@molecules/ReprocessingDraftForm', () => ({
  ReprocessingDraftForm: (props: {
    onRestartStageChange: (stage: 'ocr_processor') => void
    onRequestedStagesChange: (stages: ['ocr_processor']) => void
  }) => (
    <div>
      <button
        type={'button'}
        onClick={() => {
          props.onRestartStageChange('ocr_processor')
          props.onRequestedStagesChange(['ocr_processor'])
        }}
      >
        {'Change stages'}
      </button>
    </div>
  ),
}))

vi.mock('@organisms/ReprocessingDraftDocumentsTable', () => ({
  ReprocessingDraftDocumentsTable: () => <div />,
}))

vi.mock('@molecules/ReprocessingDraftSubmissionSummary', () => ({
  ReprocessingDraftSubmissionSummary: () => <div />,
}))

function buildDraft() {
  return {
    id: 'draft-1',
    name: 'Needs review corrections',
    collectionName: null,
    collectionNotes: null,
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
        idLegacy: null,
        sourceBatchId: null,
        sourceBatchLegacyId: null,
        sourceBatchName: null,
        addedAt: null,
      },
    ],
  }
}

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mountedRoot: Root | undefined

describe('ReprocessingDraftWorkspace stage-plan editing', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('disables submission when the stage plan has unsaved changes', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    mountedRoot = createRoot(container)

    act(() => {
      mountedRoot?.render(
        <ThemeProvider>
          <ReprocessingDraftWorkspace initialDraft={buildDraft()} />
        </ThemeProvider>,
      )
    })

    const submitButton = () =>
      [...container.querySelectorAll('button')].find((button) =>
        button.textContent?.includes(SUBMIT_LABEL),
      ) as HTMLButtonElement
    expect(submitButton().disabled).toBe(false)

    act(() => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(submitButton().disabled).toBe(true)
  })
})
