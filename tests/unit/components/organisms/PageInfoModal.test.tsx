// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { PageInfoModal } from '@organisms/PageInfoModal'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mountedRoot: Root | undefined

function renderPageInfoModal(): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mountedRoot = createRoot(container)

  act(() => {
    mountedRoot?.render(
      <PageInfoModal title={'About this page'}>
        <p>Helpful page information.</p>
      </PageInfoModal>,
    )
  })
}

describe('PageInfoModal', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    document.body.replaceChildren()
  })

  it('opens the shared modal from the page information button and closes it', () => {
    renderPageInfoModal()

    expect(document.querySelector('[aria-label="Close"]')).toBeNull()

    act(() => {
      document.querySelector<HTMLButtonElement>('[aria-label="Page information"]')?.click()
    })

    expect(document.body.textContent).toContain('About this page')
    expect(document.body.textContent).toContain('Helpful page information.')

    act(() => {
      document.querySelector<HTMLButtonElement>('[aria-label="Close"]')?.click()
    })

    expect(document.querySelector('[role="dialog"]')?.parentElement?.getAttribute('style')).toContain('opacity: 0')
  })
})
