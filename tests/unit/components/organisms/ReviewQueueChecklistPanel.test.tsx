// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildDefaultReviewQueueChecklistState, ReviewQueueChecklistPanel } from '@organisms/ReviewQueueChecklistPanel'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ReviewQueueChecklistPanel', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('keeps the table cell compact and opens an interactive checklist popover', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const onToggle = vi.fn()

    act(() => {
      root.render(
        <ReviewQueueChecklistPanel
          documentId={'doc-1'}
          checklistState={buildDefaultReviewQueueChecklistState()}
          onToggle={onToggle}
        />,
      )
    })

    expect(container.textContent).toContain('Checklist')
    expect(container.textContent).toContain('0/5')
    expect(container.textContent).not.toContain('Metadata reviewed')

    act(() => {
      container.querySelector('button')?.click()
    })

    expect(document.body.textContent).toContain('Checklist')
    expect(document.body.textContent).toContain('Metadata reviewed')
    expect(document.body.querySelectorAll('input[type="checkbox"]')).toHaveLength(5)

    act(() => {
      document.body.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click()
    })

    expect(onToggle).toHaveBeenCalledWith('metadataReviewed')

    act(() => {
      root.unmount()
    })
  })
})
