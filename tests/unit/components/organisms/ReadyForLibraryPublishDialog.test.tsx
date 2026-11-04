// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  names: vi.fn(),
  publish: vi.fn(),
}))

vi.mock('@actions/ready-for-library', () => ({
  getReadyForLibrarySelectionAction: mocks.names,
  publishReadyForLibraryAction: mocks.publish,
}))
vi.mock('@organisms/Modal', () => ({
  Modal: ({ open, title, children, actions }: { open: boolean; title: string; children: React.ReactNode; actions: React.ReactNode }) =>
    open ? <section><h2>{title}</h2>{children}{actions}</section> : null,
}))

import { ReadyForLibraryPublishDialog } from '@organisms/ReadyForLibraryPublishDialog'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.replaceChildren()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('ReadyForLibraryPublishDialog', () => {
  it('shows only selected off-page document names and the fixed stage path', async () => {
    mocks.names.mockResolvedValue([
      { id: 'doc-one', name: 'First document' },
      { id: 'doc-two', name: 'Second document' },
    ])
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root?.render(<ReadyForLibraryPublishDialog documentIds={['doc-two', 'doc-one']} operationId={'operation-one'} onClose={vi.fn()} onPublished={vi.fn()} />)
      await Promise.resolve()
    })

    expect(mocks.names).toHaveBeenCalledWith(['doc-two', 'doc-one'])
    expect(container.textContent).toContain('First document')
    expect(container.textContent).toContain('Second document')
    expect(container.textContent).toContain('Data Ingester, then Fedora Ingester')
    expect(container.textContent).not.toContain('Unselected neighbor')
  })

  it('retries a queue failure with the same operation and links to the created batch', async () => {
    mocks.names.mockResolvedValue([{ id: 'doc-one', name: 'First document' }])
    mocks.publish
      .mockResolvedValueOnce({ ok: false, error: 'Queue unavailable', batchId: 'publication-batch' })
      .mockResolvedValueOnce({ ok: true, batchId: 'publication-batch' })
    const onPublished = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root?.render(<ReadyForLibraryPublishDialog documentIds={['doc-one']} operationId={'operation-one'} onClose={vi.fn()} onPublished={onPublished} />)
      await Promise.resolve()
    })
    const input = container.querySelector('input')
    expect(input).not.toBeNull()
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(input, 'Publish test batch')
      input?.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const button = (label: string) => Array.from(container.querySelectorAll('button')).find((item) => item.textContent === label)
    await act(async () => {
      button('Publish')?.click()
      await Promise.resolve()
    })
    expect(container.textContent).toContain('Queue unavailable')
    expect(container.querySelector('a[href="/batches/publication-batch"]')).not.toBeNull()
    await act(async () => {
      button('Retry queueing')?.click()
      await Promise.resolve()
    })
    expect(mocks.publish).toHaveBeenCalledTimes(2)
    expect(mocks.publish).toHaveBeenNthCalledWith(1, { documentIds: ['doc-one'], name: 'Publish test batch', operationId: 'operation-one' })
    expect(mocks.publish).toHaveBeenNthCalledWith(2, { documentIds: ['doc-one'], name: 'Publish test batch', operationId: 'operation-one' })
    expect(onPublished).toHaveBeenCalledOnce()
  })
})
