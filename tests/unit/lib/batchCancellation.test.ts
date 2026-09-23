import { afterEach, describe, expect, it, vi } from 'vitest'

import { cancelBatch } from '@lib/batchCancellation'

describe('cancelBatch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts a cancellation request to the dashboard proxy', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ batch_id: 'batch-1', lifecycle_status: 'cancelled', cancelled_count: 2 }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await cancelBatch('batch/1')

    expect(fetch).toHaveBeenCalledWith('/api/process/batches/batch%2F1/cancel', {
      method: 'POST',
      cache: 'no-store',
    })
  })
})
