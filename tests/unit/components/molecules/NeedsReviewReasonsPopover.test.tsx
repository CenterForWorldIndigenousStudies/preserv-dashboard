// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { NeedsReviewReasonsPopover } from '@molecules/NeedsReviewReasonsPopover'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const groups = [
  {
    serviceKey: 'document_splitter_1',
    serviceLabel: 'Document Splitter Pass 1',
    reasons: ['Boundary requires review.', 'A second boundary also needs review.'],
  },
  {
    serviceKey: 'ocr_processor',
    serviceLabel: 'OCR Processor',
    reasons: ['OCR confidence is too low.'],
  },
]

let mountedRoot: Root | undefined

function renderPopover(reasonGroups = groups): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mountedRoot = createRoot(container)

  act(() => {
    mountedRoot?.render(<NeedsReviewReasonsPopover documentId={'doc-1'} groups={reasonGroups} />)
  })

  return container
}

describe('NeedsReviewReasonsPopover', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    document.body.replaceChildren()
  })

  it('renders a count trigger with accessible popover relationships', () => {
    const container = renderPopover()
    const trigger = container.querySelector('button')

    expect(trigger?.textContent).toBe('3 reasons')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(trigger?.getAttribute('aria-controls')).toBeTruthy()
  })

  it('opens the full reason details on click and closes on Escape', () => {
    const container = renderPopover()
    const trigger = container.querySelector<HTMLButtonElement>('button')
    const popoverId = trigger?.getAttribute('aria-controls')

    act(() => {
      trigger?.click()
    })

    expect(trigger?.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById(popoverId ?? '')?.textContent).toContain('OCR Processor')
    expect(document.getElementById(popoverId ?? '')?.textContent).toContain('A second boundary also needs review.')

    act(() => {
      document.getElementById(popoverId ?? '')?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })

    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
  })

  it('renders an em dash when no reasons are available', () => {
    const container = renderPopover([])

    expect(container.textContent).toContain('—')
    expect(container.querySelector('button')).toBeNull()
  })
})
