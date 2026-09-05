// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ActionButton } from '@organisms/ReviewQueueTable'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined

describe('ActionButton', () => {
  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    root = undefined
    document.body.replaceChildren()
  })

  it('offers approve, reject, and reprocess actions for the selected documents', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const onApprove = vi.fn()
    const onReject = vi.fn()
    const onReprocess = vi.fn()

    act(() => {
      root?.render(
        <ActionButton
          batchActionPending={false}
          selectedCount={2}
          hasSelectedDraftDocuments={false}
          onApprove={onApprove}
          onReject={onReject}
          onReprocess={onReprocess}
          onRemove={vi.fn()}
        />,
      )
    })

    expect(container.textContent).toContain('Actions (2)')
    expect(document.body.textContent).not.toContain('Approve')

    act(() => {
      container.querySelector<HTMLButtonElement>('button')?.click()
    })

    expect(document.body.textContent).toContain('Approve')
    expect(document.body.textContent).toContain('Reject')
    expect(document.body.textContent).toContain('Reprocess')

    const reprocessItem = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find(
      (item) => item.textContent === 'Reprocess',
    )
    act(() => {
      ;(reprocessItem as HTMLElement | undefined)?.click()
    })

    expect(onReprocess).toHaveBeenCalledOnce()
  })

  it('offers removal when at least one selected document is in a draft', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const onRemove = vi.fn()

    act(() => {
      root?.render(
        <ActionButton
          batchActionPending={false}
          selectedCount={2}
          hasSelectedDraftDocuments
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onReprocess={vi.fn()}
          onRemove={onRemove}
        />,
      )
    })

    act(() => {
      container.querySelector<HTMLButtonElement>('button')?.click()
    })

    const removeItem = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find(
      (item) => item.textContent === 'Remove from draft',
    )
    expect(removeItem).toBeDefined()
    act(() => {
      ;(removeItem as HTMLElement | undefined)?.click()
    })
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('does not offer removal when no selected document is in a draft', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <ActionButton
          batchActionPending={false}
          selectedCount={1}
          hasSelectedDraftDocuments={false}
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onReprocess={vi.fn()}
          onRemove={vi.fn()}
        />,
      )
    })
    act(() => {
      container.querySelector<HTMLButtonElement>('button')?.click()
    })

    expect(document.body.textContent).not.toContain('Remove from draft')
  })
})
