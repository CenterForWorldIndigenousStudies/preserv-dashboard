import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetDashboardSession } = vi.hoisted(() => ({
  mockGetDashboardSession: vi.fn(),
}))

vi.mock('@root/auth', () => ({
  getDashboardSession: mockGetDashboardSession,
}))

import { POST } from '@api/process/batches/[batchId]/cancel/route'

describe('batch cancellation proxy route', () => {
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

  it('forwards an authenticated cancellation request', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ lifecycle_status: 'cancelled' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const response = await POST(
      new NextRequest('http://localhost/api/process/batches/batch-1/cancel', { method: 'POST' }),
      { params: Promise.resolve({ batchId: 'batch-1' }) },
    )

    expect(response.status).toBe(202)
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? []
    expect(url).toEqual(new URL('http://localhost:8000/batches/batch-1/cancel'))
    expect(init).toEqual({
      method: 'POST',
      headers: { Authorization: 'Bearer pipeline-trigger-token' },
      cache: 'no-store',
    })
  })
})
