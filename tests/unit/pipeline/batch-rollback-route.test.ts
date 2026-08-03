import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetDashboardSession } = vi.hoisted(() => ({
  mockGetDashboardSession: vi.fn(),
}))

vi.mock('@root/auth', () => ({
  getDashboardSession: mockGetDashboardSession,
}))

import { POST } from '@api/process/batches/[batchId]/rollback/route'

describe('batch rollback proxy route', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.PIPELINE_API_BASE_URL = 'http://localhost:8000'
    process.env.PIPELINE_TRIGGER_TOKEN = 'pipeline-trigger-token'
    mockGetDashboardSession.mockResolvedValue({ user: { email: 'operator@example.test' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    delete process.env.PIPELINE_API_BASE_URL
    delete process.env.PIPELINE_TRIGGER_TOKEN
  })

  it('rejects an unauthenticated operator', async () => {
    mockGetDashboardSession.mockResolvedValue(null)
    const response = await POST(
      new NextRequest('http://localhost/api/process/batches/batch-1/rollback', {
        method: 'POST',
      }),
      { params: Promise.resolve({ batchId: 'batch-1' }) },
    )

    expect(response.status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('forwards the authenticated operator and reason', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ status: 'requested' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const response = await POST(
      new NextRequest('http://localhost/api/process/batches/batch-1/rollback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'Needs review' }),
      }),
      { params: Promise.resolve({ batchId: 'batch-1' }) },
    )

    expect(response.status).toBe(202)
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? []
    expect(url).toEqual(new URL('http://localhost:8000/batches/batch-1/rollback'))
    expect(init?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer pipeline-trigger-token',
    })
    if (typeof init?.body !== 'string') {
      throw new Error('Expected the proxy to send a JSON request body.')
    }
    const payload = JSON.parse(init.body) as Record<string, unknown>
    expect(payload.requested_by).toBe('operator@example.test')
    expect(payload.reason).toBe('Needs review')
    expect(typeof payload.idempotency_key).toBe('string')
  })
})
