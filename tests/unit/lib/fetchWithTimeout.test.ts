import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('fetchWithTimeout', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('rejects with the timeout message when the fetch hangs', async () => {
    fetchMock.mockImplementation((_input, init?: RequestInit) => {
      const signal = init?.signal

      return new Promise((_, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })

    const { fetchWithTimeout } = await import('@lib/fetchWithTimeout')

    const requestPromise = fetchWithTimeout('https://example.test/slow', undefined, {
      timeoutMs: 500,
      timeoutMessage: 'Request timed out.',
    })
    const expectation = expect(requestPromise).rejects.toThrow('Request timed out.')

    await vi.advanceTimersByTimeAsync(500)

    await expectation
  })

  it('returns the response when the fetch completes before the timeout', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { fetchWithTimeout } = await import('@lib/fetchWithTimeout')

    const response = await fetchWithTimeout('https://example.test/fast', undefined, {
      timeoutMs: 500,
      timeoutMessage: 'Request timed out.',
    })

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
