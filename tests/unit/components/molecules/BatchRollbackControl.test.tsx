// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@lib/batchRollback', () => ({
  requestBatchRollback: vi.fn(),
  retryBatchRollback: vi.fn(),
}))

import ThemeProvider from '@components/ThemeProvider'
import { BatchRollbackControl } from '@molecules/BatchRollbackControl'

describe('BatchRollbackControl', () => {
  let root: Root | undefined

  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    document.body.replaceChildren()
  })

  function renderControl(props: React.ComponentProps<typeof BatchRollbackControl>) {
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <ThemeProvider>
          <BatchRollbackControl {...props} />
        </ThemeProvider>,
      )
    })

    return container
  }

  it('uses rollback terminology for the batch action', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <BatchRollbackControl
          batchId={'batch-1'}
          lifecycleStatus={'running'}
          publicationStatus={'not_started'}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('Rollback batch')
  })

  it('uses the shared confirmation dialog for a rollback request', () => {
    const container = renderControl({
      batchId: 'batch-1',
      lifecycleStatus: 'running',
      publicationStatus: 'not_started',
    })

    act(() => {
      container.querySelector('button')?.click()
    })

    expect(document.body.textContent).toContain('Roll back this batch?')
    expect(document.body.textContent).toContain('Its queued work and reversible changes will be rolled back.')
    expect(document.body.textContent).toContain('Cancel')
  })
})
