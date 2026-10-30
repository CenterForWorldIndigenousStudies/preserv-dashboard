import { afterEach, describe, expect, it, vi } from 'vitest'

import { getLibraryRemoval, requestLibraryRemoval, retryLibraryRemovalItem } from '@lib/libraryRemoval'

afterEach(() => vi.unstubAllGlobals())

describe('Library removal client', () => {
  it('submits selected document IDs to the authenticated server route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'request-1' }))))

    await requestLibraryRemoval(['doc-1', 'doc-2'])

    expect(fetch).toHaveBeenCalledWith('/api/library/removals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentIds: ['doc-1', 'doc-2'] }),
    })
  })

  it('loads durable status and retries one item only', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'request-1' }))))

    await getLibraryRemoval('request-1')
    await retryLibraryRemovalItem('request-1', 'item-1')

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/library/removals/request-1', { cache: 'no-store' })
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/library/removals/request-1/items/item-1/retry', { method: 'POST' })
  })

  it('surfaces an API error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Rejected' }), { status: 409 })),
    )

    await expect(requestLibraryRemoval(['doc-1'])).rejects.toThrow('Rejected')
  })
})
