// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockRequestRemoval, mockGetRemoval, mockRetryItem, mockRouterRefresh } = vi.hoisted(() => ({
  mockRequestRemoval: vi.fn(),
  mockGetRemoval: vi.fn(),
  mockRetryItem: vi.fn(),
  mockRouterRefresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRouterRefresh }) }))
vi.mock('@lib/libraryRemoval', () => ({
  requestLibraryRemoval: mockRequestRemoval,
  getLibraryRemoval: mockGetRemoval,
  retryLibraryRemovalItem: mockRetryItem,
}))
vi.mock('@organisms/Modal', () => ({
  Modal: ({
    open,
    title,
    children,
    actions,
    onClose,
  }: {
    open: boolean
    title: string
    children: React.ReactNode
    actions: React.ReactNode
    onClose: () => void
  }) =>
    open ? (
      <section>
        <h2>{title}</h2>
        {children}
        <button onClick={onClose}>Close modal</button>
        {actions}
      </section>
    ) : null,
}))

import { LibraryRemovalActions } from '@organisms/LibraryRemovalActions'
import { LibraryRemovalItemStatus } from '@organisms/LibraryRemovalItemStatus'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined

const attentionRequest = {
  id: 'request-1',
  status: 'needs_attention' as const,
  requested_by: 'operator@example.test',
  requested_at: null,
  started_at: null,
  completed_at: null,
  last_failure: 'Could not confirm Fedora state',
  items: [
    {
      id: 'item-1',
      document_id: 'doc-1',
      publication_document_id: 'publication-1',
      source_candidate_document_id: 'source-1',
      status: 'needs_attention' as const,
      fedora_delete_status: 'unknown',
      drive_quarantine_status: 'pending',
      restoration_status: 'pending',
      error_type: 'PermissionError',
      error_message: 'Could not confirm Fedora state',
      retryable: true,
      requested_at: null,
      started_at: null,
      completed_at: null,
    },
  ],
}

describe('LibraryRemovalActions', () => {
  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it('opens only when requested and confirms destructive details for multi-selection', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root?.render(<LibraryRemovalActions documentIds={[]} open={false} onClose={vi.fn()} />))
    expect(container.textContent).toBe('')

    act(() => root?.render(<LibraryRemovalActions documentIds={['doc-1', 'doc-2']} open onClose={vi.fn()} />))
    expect(container.textContent).not.toContain('Remove from Library (2)')
    expect(document.body.textContent).toContain('deletes each selected Fedora node and its attached media/files')
    expect(document.body.textContent).toContain('reprocessing requires a new batch')
  })

  it('shows per-item needs-attention state and retries only that item', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mockRequestRemoval.mockResolvedValue(attentionRequest)
    mockRetryItem.mockResolvedValue(attentionRequest.items[0])

    act(() => root?.render(<LibraryRemovalActions documentIds={['doc-1', 'doc-2']} open onClose={vi.fn()} />))
    const confirmButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent === 'Remove from Library',
    )
    await act(async () => {
      confirmButton?.click()
      await Promise.resolve()
    })

    expect(document.body.textContent).toContain('This outcome needs operator review')
    expect(document.body.textContent).toContain('doc-1: needs attention')
    const retryButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent === 'Retry this document',
    )
    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
    })
    expect(mockRetryItem).toHaveBeenCalledWith('request-1', 'item-1')
  })

  it('keeps retry available from a Library row after the original progress modal is gone', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mockRetryItem.mockResolvedValue(attentionRequest.items[0])

    act(() => {
      root?.render(
        <LibraryRemovalItemStatus
          requestId={'request-1'}
          itemId={'item-1'}
          status={'needs_attention'}
          error={'Could not confirm Fedora state'}
          retryable
        />,
      )
    })
    const retryButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Retry removal',
    )
    await act(async () => {
      retryButton?.click()
      await Promise.resolve()
    })

    expect(mockRetryItem).toHaveBeenCalledWith('request-1', 'item-1')
    expect(container.textContent).toContain('requested')
  })

  it('continues polling after closing progress and refreshes the Library when removal completes', async () => {
    vi.useFakeTimers()
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mockRequestRemoval.mockResolvedValue({ ...attentionRequest, status: 'in_progress' as const })
    mockGetRemoval.mockResolvedValue({ ...attentionRequest, status: 'completed' as const })

    act(() => root?.render(<LibraryRemovalActions documentIds={['doc-1']} open onClose={vi.fn()} />))
    const confirmButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent === 'Remove from Library',
    )
    await act(async () => {
      confirmButton?.click()
      await Promise.resolve()
    })
    expect(mockRouterRefresh).toHaveBeenCalledOnce()

    act(() => {
      Array.from(document.body.querySelectorAll('button'))
        .find((button) => button.textContent === 'Close modal')
        ?.click()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })

    expect(mockGetRemoval).toHaveBeenCalledWith('request-1')
    expect(mockRouterRefresh).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})
