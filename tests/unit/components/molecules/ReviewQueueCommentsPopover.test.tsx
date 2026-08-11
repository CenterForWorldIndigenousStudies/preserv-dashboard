// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { ReviewQueueCommentsPopover } from '@molecules/ReviewQueueCommentsPopover'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ReviewQueueCommentsPopover', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('shows review comments when the trigger is clicked', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <ReviewQueueCommentsPopover
          documentId={'doc-1'}
          comment={'Review the source metadata.'}
          additionalComment={'Confirm the collection assignment.'}
          trigger={<span>Comments</span>}
        />,
      )
    })

    expect(document.body.textContent).not.toContain('Review the source metadata.')

    act(() => {
      container.querySelector('button')?.click()
    })

    expect(document.body.textContent).toContain('Review comments')
    expect(document.body.textContent).toContain('Review the source metadata.')
    expect(document.body.textContent).toContain('Confirm the collection assignment.')

    act(() => {
      root.unmount()
    })
  })
})
