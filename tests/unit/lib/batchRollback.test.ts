import { afterEach, describe, expect, it, vi } from 'vitest'

import { requestBatchRollback, retryBatchRollback } from '@lib/batchRollback'

describe('requestBatchRollback', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the optional reason to the dashboard rollback proxy', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'rollback-1', batch_id: 'batch-1', status: 'requested' }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await requestBatchRollback('batch/1', '  Needs review  ')

    expect(fetch).toHaveBeenCalledWith('/api/process/batches/batch%2F1/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Needs review' }),
    })
  })

  it('surfaces the API error detail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Rollback is unavailable after publication' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(requestBatchRollback('batch-1')).rejects.toThrow(
      'Rollback is unavailable after publication',
    )
  })

  it('posts a retry request for a failed rollback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'rollback-1', batch_id: 'batch-1', status: 'requested' }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await retryBatchRollback('batch/1')

    expect(fetch).toHaveBeenCalledWith('/api/process/batches/batch%2F1/rollback/retry', {
      method: 'POST',
      cache: 'no-store',
    })
  })
})
