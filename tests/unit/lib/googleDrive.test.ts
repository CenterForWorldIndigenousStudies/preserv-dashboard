import { generateKeyPairSync } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
})

const SERVICE_ACCOUNT_JSON = JSON.stringify({
  client_email: 'dashboard-test@example.org',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
})

describe('googleDrive', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = SERVICE_ACCOUNT_JSON
    delete process.env.GOOGLE_SERVICE_ACCOUNT_FILE
    delete process.env.GOOGLE_INGEST_SOURCE_ROOT_FOLDER_IDS
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    delete process.env.GOOGLE_SERVICE_ACCOUNT_FILE
    delete process.env.GOOGLE_INGEST_SOURCE_ROOT_FOLDER_IDS
  })

  it('lists shared root folders through the Drive API', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              { id: 'folder-b', name: 'Beta' },
              { id: 'folder-a', name: 'Alpha' },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )

    const { listRootDriveFolders } = await import('@lib/googleDrive')
    const folders = await listRootDriveFolders()

    expect(folders).toEqual([
      { id: 'folder-a', name: 'Alpha' },
      { id: 'folder-b', name: 'Beta' },
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://oauth2.googleapis.com/token')
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('sharedWithMe+%3D+true')
  })

  it('lists child folders under the requested parent id', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              { id: 'child-2', name: 'Zulu' },
              { id: 'child-1', name: 'Alpha' },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )

    const { listChildDriveFolders } = await import('@lib/googleDrive')
    const folders = await listChildDriveFolders('parent-123')

    expect(folders).toEqual([
      { id: 'child-1', name: 'Alpha' },
      { id: 'child-2', name: 'Zulu' },
    ])
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('parent-123')
  })

  it('fails with a clear message when the Drive API request times out', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockImplementationOnce((_input, init?: RequestInit) => {
        const signal = init?.signal

        return new Promise((_, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
        })
      })

    const { listChildDriveFolders } = await import('@lib/googleDrive')

    const requestPromise = listChildDriveFolders('parent-123')
    const expectation = expect(requestPromise).rejects.toThrow(
      'Google Drive request timed out.',
    )
    await vi.advanceTimersByTimeAsync(15000)

    await expectation
  })
})
