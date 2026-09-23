// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PROCESS_FOLDERS_PATH } from '@constants/paths'
import { ProcessDocumentsWorkspace } from '@organisms/ProcessDocumentsWorkspace'
import type { ReprocessingDraftDetail } from 'types/reprocessingDrafts'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push }),
}))

vi.mock('@lib/hooks/useBatchSearch', () => ({
  useBatchSearch: () => ({ exactMatch: null, error: null }),
}))

vi.mock('@organisms/ProcessBatchMonitor', () => ({
  ProcessBatchMonitor: () => <div />,
}))

vi.mock('@organisms/BatchDraftWorkspace', () => ({
  BatchDraftWorkspace: () => <div>{'Draft workspace'}</div>,
}))

vi.mock('@molecules/BatchCart', () => ({
  BatchCart: ({ onManageDraft }: { onManageDraft?: (draftId: string) => void }) => (
    <div>
      <button onClick={() => onManageDraft?.('draft-1')}>{'Manage draft-1'}</button>
    </div>
  ),
}))

vi.mock('@molecules/BatchDraftForm', () => ({
  BatchDraftForm: ({ onNameChange }: { onNameChange: (value: string) => void }) => (
    <input aria-label={'Batch name'} onChange={(event) => onNameChange(event.target.value)} />
  ),
}))

vi.mock('@molecules/ConfirmationDialog', () => ({
  ConfirmationDialog: ({
    open,
    message,
    onConfirm,
    onCancel,
  }: {
    open: boolean
    message: string
    onConfirm: () => void
    onCancel: () => void
  }) =>
    open ? (
      <div>
        <div>{message}</div>
        <button onClick={onConfirm}>{'Discard and manage'}</button>
        <button onClick={onCancel}>{'Cancel'}</button>
      </div>
    ) : null,
}))


;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mountedRoot: Root | undefined

function renderWorkspace(props: {
  initialDraft?: ReprocessingDraftDetail
} = {}): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mountedRoot = createRoot(container)

  act(() => {
    mountedRoot?.render(<ProcessDocumentsWorkspace initialBatches={[]} initialDrafts={[]} {...props} />)
  })

  return container
}

describe('ProcessDocumentsWorkspace', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('presents the new batch draft workspace with Google Drive expanded', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url === PROCESS_FOLDERS_PATH) {
        return Promise.resolve(
          new Response(JSON.stringify({ folders: [{ id: 'folder-1', name: 'Folder 1' }] }), { status: 200 }),
        )
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    const container = renderWorkspace()
    await act(async () => {
      await Promise.resolve()
    })

    expect(container.textContent).toContain('Create a new batch')
    expect(container.textContent).toContain('Browse Google Drive folders')
    expect(container.querySelector('[aria-expanded="true"]')).not.toBeNull()
  })

  it('replaces the draft workspace with the new batch form', async () => {
    const container = renderWorkspace({ initialDraft: buildDraft() })
    await act(async () => {
      await Promise.resolve()
    })

    expect(container.textContent).toContain('Draft workspace')
    const createButton = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Create New Batch'),
    )
    expect(createButton).toBeDefined()

    act(() => {
      createButton?.click()
    })

    expect(container.textContent).not.toContain('Draft workspace')
    expect(container.querySelector('input[aria-label="Batch name"]')).not.toBeNull()
  })

  it('confirms before managing a draft when the new batch form has changes', async () => {
    const container = renderWorkspace()
    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      const input = container.querySelector('input[aria-label="Batch name"]')
      if (!input) throw new Error('Batch name input not found')
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(input, 'Unsaved batch')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    act(() => {
      const manageButton = [...container.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Manage draft-1'),
      )
      manageButton?.click()
    })

    expect(container.textContent).toContain('Your unsaved new batch changes will be lost.')
    expect(push).not.toHaveBeenCalled()

    act(() => {
      const cancelButton = [...container.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Cancel'),
      )
      cancelButton?.click()
    })

    expect(container.textContent).not.toContain('Your unsaved new batch changes will be lost.')
    expect(container.querySelector('input[aria-label="Batch name"]')).not.toBeNull()
    expect(push).not.toHaveBeenCalled()

    act(() => {
      const manageButton = [...container.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Manage draft-1'),
      )
      manageButton?.click()
    })

    act(() => {
      const confirmButton = [...container.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Discard and manage'),
      )
      confirmButton?.click()
    })

    expect(push).toHaveBeenCalledWith('/process-documents?draftId=draft-1')
  })
})

function buildDraft() {
  return {
    id: 'draft-1',
    name: 'Draft batch',
    collectionName: null,
    collectionNotes: null,
    restartStage: 'data_ingester' as const,
    requestedStages: ['data_ingester'] as const,
    reason: 'Initial preservation batch',
    documentCount: 0,
    createdAt: null,
    updatedAt: null,
    createdBy: null,
    updatedBy: null,
    documents: [],
  }
}
