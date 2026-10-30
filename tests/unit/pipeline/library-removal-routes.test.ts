import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetDashboardSession } = vi.hoisted(() => ({ mockGetDashboardSession: vi.fn() }))

vi.mock('@root/auth', () => ({ getDashboardSession: mockGetDashboardSession }))

import { POST as submitRemoval } from '@api/library/removals/route'
import { GET as getRemoval } from '@api/library/removals/[requestId]/route'
import { POST as retryRemoval } from '@api/library/removals/[requestId]/items/[itemId]/retry/route'

describe('Library removal proxy routes', () => {
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

  it('requires an authenticated operator and never calls the pipeline anonymously', async () => {
    mockGetDashboardSession.mockResolvedValue(null)
    const response = await submitRemoval(
      new NextRequest('http://localhost/api/library/removals', {
        method: 'POST',
        body: JSON.stringify({ documentIds: ['doc-1'] }),
      }),
    )

    expect(response.status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('requires pipeline configuration', async () => {
    delete process.env.PIPELINE_TRIGGER_TOKEN
    const response = await submitRemoval(
      new NextRequest('http://localhost/api/library/removals', {
        method: 'POST',
        body: JSON.stringify({ documentIds: ['doc-1'] }),
      }),
    )

    expect(response.status).toBe(500)
  })

  it('forwards the session email and preserves the upstream status', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: 'request-1' }), { status: 202 }))
    const response = await submitRemoval(
      new NextRequest('http://localhost/api/library/removals', {
        method: 'POST',
        body: JSON.stringify({ documentIds: ['doc-1', 'doc-2'] }),
      }),
    )

    expect(response.status).toBe(202)
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? []
    expect(url).toEqual(new URL('http://localhost:8000/fedora-removals'))
    expect(init?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer pipeline-trigger-token',
    })
    if (typeof init?.body !== 'string') throw new Error('Expected a JSON request body.')
    const payload = JSON.parse(init.body) as Record<string, unknown>
    expect(payload.document_ids).toEqual(['doc-1', 'doc-2'])
    expect(payload.requested_by).toBe('operator@example.test')
    expect(typeof payload.idempotency_key).toBe('string')
  })

  it('proxies status and retry requests with the trigger token', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ status: 'in_progress' }), { status: 200 }))
    const context = { params: Promise.resolve({ requestId: 'request-1', itemId: 'item-1' }) }
    const statusResponse = await getRemoval(new Request('http://localhost/api'), context)
    expect(statusResponse.status).toBe(200)
    expect(fetch).toHaveBeenLastCalledWith(
      new URL('http://localhost:8000/fedora-removals/request-1'),
      expect.objectContaining({ headers: { Authorization: 'Bearer pipeline-trigger-token' }, cache: 'no-store' }),
    )

    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: 'item-1' }), { status: 202 }))
    const retryResponse = await retryRemoval(new NextRequest('http://localhost/api/retry', { method: 'POST' }), context)
    expect(retryResponse.status).toBe(202)
    expect(fetch).toHaveBeenLastCalledWith(
      new URL('http://localhost:8000/fedora-removals/request-1/items/item-1/retry'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ requested_by: 'operator@example.test' }) }),
    )
  })
})
