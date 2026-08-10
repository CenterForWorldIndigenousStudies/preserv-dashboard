// @vitest-environment jsdom

import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useBatchSearch } from '@lib/hooks/useBatchSearch'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mountedRoot: Root | undefined

function SearchHarness({ query }: { query: string }): ReactElement {
  const result = useBatchSearch(query)

  return (
    <output data-testid={'search-result'}>
      {JSON.stringify({
        suggestions: result.suggestions,
        exactMatch: result.exactMatch,
        isLoading: result.isLoading,
        error: result.error,
      })}
    </output>
  )
}

function renderSearch(query: string): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mountedRoot = createRoot(container)

  act(() => {
    mountedRoot?.render(<SearchHarness query={query} />)
  })

  return container
}

describe('useBatchSearch', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('clears state and avoids a request for empty input', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const container = renderSearch('   ')

    expect(container.querySelector('[data-testid="search-result"]')?.textContent).toContain('"suggestions":[]')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads suggestions and the exact match after the debounce', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
        batches: [{ id: 'batch-1', name: 'Special batch', score: 140 }],
        exactMatch: { id: 'batch-1', name: 'Special batch', score: 140 },
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const container = renderSearch('Special batch')

    await new Promise<void>((resolve) => {
      window.setTimeout(() => {
        resolve()
      }, 240)
    })
    await act(async () => {
      await Promise.resolve()
    })

    const result = container.querySelector('[data-testid="search-result"]')?.textContent ?? ''
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('query=Special+batch'), expect.anything())
    expect(result).toContain('Special batch')
    expect(result).toContain('batch-1')
  })
})
