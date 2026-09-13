// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReviewQueueActionButton } from '@molecules/ReviewQueueActionButton'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined

describe('ReviewQueueActionButton', () => {
  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    root = undefined
    document.body.replaceChildren()
  })

  it('offers the review actions for a single document', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const onReprocess = vi.fn()

    act(() => {
      root?.render(
        <ReviewQueueActionButton
          batchActionPending={false}
          selectedCount={1}
          hasSelectedDraftDocuments={false}
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onReprocess={onReprocess}
          onRemove={vi.fn()}
        />,
      )
    })

    expect(container.textContent).toContain('Actions (1)')

    act(() => {
      container.querySelector<HTMLButtonElement>('button')?.click()
    })

    expect(document.body.textContent).toContain('Approve')
    expect(document.body.textContent).toContain('Reject')
    expect(document.body.textContent).toContain('Reprocess')

    act(() => {
      Array.from(document.body.querySelectorAll('[role="menuitem"]'))
        .find((item) => item.textContent === 'Reprocess')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onReprocess).toHaveBeenCalledOnce()
  })
})
