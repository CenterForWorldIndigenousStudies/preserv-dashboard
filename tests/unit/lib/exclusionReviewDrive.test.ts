import { generateKeyPairSync } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
})

const SERVICE_ACCOUNT_JSON = JSON.stringify({
  client_email: 'dashboard-test@example.org',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
})

describe('exclusionReviewDrive', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = SERVICE_ACCOUNT_JSON
    process.env.EXCLUSION_REVIEW_ROOT_FOLDER_ID = 'root-folder-1'
    delete process.env.GOOGLE_SERVICE_ACCOUNT_FILE
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    delete process.env.GOOGLE_SERVICE_ACCOUNT_FILE
    delete process.env.EXCLUSION_REVIEW_ROOT_FOLDER_ID
  })

  it('returns the configured root as a drive index item', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'root-folder-1',
            name: 'Configured Root',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )

    const { getExclusionReviewRootFromDrive } = await import(
      '@lib/exclusionReviewDrive'
    )

    await expect(getExclusionReviewRootFromDrive()).resolves.toEqual({
      driveId: 'root-folder-1',
      parentDriveId: null,
      itemType: 'folder',
      name: 'Configured Root',
      mimeType: 'application/vnd.google-apps.folder',
      driveUrl: 'https://drive.google.com/drive/folders/root-folder-1',
      path: [],
      depth: 0,
    })
  })

  it('lists files and folders together for a branch page and preserves paging', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'folder-123',
            name: 'Policies',
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['root-folder-1'],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'root-folder-1',
            name: 'Configured Root',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              {
                id: 'file-1',
                name: 'Annual Report.pdf',
                mimeType: 'application/pdf',
                parents: ['folder-123'],
              },
              {
                id: 'folder-456',
                name: 'Photos',
                mimeType: 'application/vnd.google-apps.folder',
                parents: ['folder-123'],
              },
            ],
            nextPageToken: 'page-2',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )

    const { listExclusionReviewChildrenFromDrive } = await import(
      '@lib/exclusionReviewDrive'
    )

    await expect(
      listExclusionReviewChildrenFromDrive('folder-123'),
    ).resolves.toEqual({
      items: [
        {
          driveId: 'folder-456',
          parentDriveId: 'folder-123',
          itemType: 'folder',
          name: 'Photos',
          mimeType: 'application/vnd.google-apps.folder',
          driveUrl: 'https://drive.google.com/drive/folders/folder-456',
          path: ['root-folder-1', 'folder-123'],
          depth: 2,
        },
        {
          driveId: 'file-1',
          parentDriveId: 'folder-123',
          itemType: 'file',
          name: 'Annual Report.pdf',
          mimeType: 'application/pdf',
          driveUrl: 'https://drive.google.com/file/d/file-1/view',
          path: ['root-folder-1', 'folder-123'],
          depth: 2,
        },
      ],
      nextPageToken: 'page-2',
    })
  })

  it('uses the stored parent path when listing children for an already indexed folder', async () => {
    fetchMock.mockImplementation((input) => {
      const url =
        input instanceof Request ? new URL(input.url) : new URL(String(input))

      if (url.origin === 'https://oauth2.googleapis.com') {
        return new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (
        url.origin === 'https://www.googleapis.com' &&
        url.pathname === '/drive/v3/files' &&
        url.searchParams.get('q') === "'folder-123' in parents and trashed = false"
      ) {
        return new Response(
          JSON.stringify({
            files: [
              {
                id: 'child-1',
                name: 'Child.pdf',
                mimeType: 'application/pdf',
                parents: ['folder-123'],
              },
            ],
            nextPageToken: null,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      if (
        url.origin === 'https://www.googleapis.com' &&
        url.pathname === '/drive/v3/files/folder-123'
      ) {
        return new Response(
          JSON.stringify({
            id: 'folder-123',
            name: 'Policies',
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['other-root'],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      if (
        url.origin === 'https://www.googleapis.com' &&
        url.pathname === '/drive/v3/files/other-root'
      ) {
        return new Response(
          JSON.stringify({
            id: 'other-root',
            name: 'Other Root',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      throw new Error(`Unexpected request: ${url.toString()}`)
    })

    const { listExclusionReviewChildrenFromDrive } = await import(
      '@lib/exclusionReviewDrive'
    )
    const listChildrenWithStoredPath =
      listExclusionReviewChildrenFromDrive as unknown as (
        parentDriveId: string,
        pageToken?: string,
        parentPath?: string[],
      ) => Promise<{ items: unknown[]; nextPageToken: string | null }>

    await expect(
      listChildrenWithStoredPath('folder-123', undefined, [
        'root-folder-1',
        'folder-123',
      ]),
    ).resolves.toEqual({
      items: [
        {
          driveId: 'child-1',
          parentDriveId: 'folder-123',
          itemType: 'file',
          name: 'Child.pdf',
          mimeType: 'application/pdf',
          driveUrl: 'https://drive.google.com/file/d/child-1/view',
          path: ['root-folder-1', 'folder-123'],
          depth: 2,
        },
      ],
      nextPageToken: null,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('searches within the configured root and filters out hits outside the subtree', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              {
                id: 'match-1',
                name: 'Annual report 1972.pdf',
                mimeType: 'application/pdf',
                parents: ['folder-123'],
              },
              {
                id: 'outside-1',
                name: 'Annual report outside root.pdf',
                mimeType: 'application/pdf',
                parents: ['other-root'],
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'match-1',
            name: 'Annual report 1972.pdf',
            mimeType: 'application/pdf',
            parents: ['folder-123'],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'folder-123',
            name: 'Policies',
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['root-folder-1'],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'root-folder-1',
            name: 'Configured Root',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'outside-1',
            name: 'Annual report outside root.pdf',
            mimeType: 'application/pdf',
            parents: ['other-root'],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'other-root',
            name: 'Other Root',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )

    const { searchExclusionReviewDriveByName } = await import(
      '@lib/exclusionReviewDrive'
    )

    await expect(searchExclusionReviewDriveByName('annual report')).resolves.toEqual([
      {
        driveId: 'match-1',
        parentDriveId: 'folder-123',
        itemType: 'file',
        name: 'Annual report 1972.pdf',
        mimeType: 'application/pdf',
        driveUrl: 'https://drive.google.com/file/d/match-1/view',
        path: ['root-folder-1', 'folder-123'],
        depth: 2,
      },
    ])
  })

  it('finds exact filenames with punctuation by retrying search with split name terms', async () => {
    fetchMock.mockImplementation((input) => {
      const url =
        input instanceof Request ? new URL(input.url) : new URL(String(input))

      if (url.origin === 'https://oauth2.googleapis.com') {
        return new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (
        url.origin === 'https://www.googleapis.com' &&
        url.pathname === '/drive/v3/files'
      ) {
        const query = url.searchParams.get('q')

        if (query === "name contains 'Document 1.pdf' and trashed = false") {
          return new Response(JSON.stringify({ files: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        if (
          query ===
          "name contains 'Document' and name contains '1' and name contains 'pdf' and trashed = false"
        ) {
          return new Response(
            JSON.stringify({
              files: [
                {
                  id: 'document-1',
                  name: 'Document 1.pdf',
                  mimeType: 'application/pdf',
                  parents: ['folder-123'],
                },
              ],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      }

      if (
        url.origin === 'https://www.googleapis.com' &&
        url.pathname === '/drive/v3/files/document-1'
      ) {
        return new Response(
          JSON.stringify({
            id: 'document-1',
            name: 'Document 1.pdf',
            mimeType: 'application/pdf',
            parents: ['folder-123'],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      if (
        url.origin === 'https://www.googleapis.com' &&
        url.pathname === '/drive/v3/files/folder-123'
      ) {
        return new Response(
          JSON.stringify({
            id: 'folder-123',
            name: 'Policies',
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['root-folder-1'],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      if (
        url.origin === 'https://www.googleapis.com' &&
        url.pathname === '/drive/v3/files/root-folder-1'
      ) {
        return new Response(
          JSON.stringify({
            id: 'root-folder-1',
            name: 'Configured Root',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      throw new Error(`Unexpected request: ${url.toString()}`)
    })

    const { searchExclusionReviewDriveByName } = await import(
      '@lib/exclusionReviewDrive'
    )

    await expect(searchExclusionReviewDriveByName('Document 1.pdf')).resolves.toEqual([
      {
        driveId: 'document-1',
        parentDriveId: 'folder-123',
        itemType: 'file',
        name: 'Document 1.pdf',
        mimeType: 'application/pdf',
        driveUrl: 'https://drive.google.com/file/d/document-1/view',
        path: ['root-folder-1', 'folder-123'],
        depth: 2,
      },
    ])
  })

  it('resolves the ancestor chain from the configured root to the requested item', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'file-1',
            name: 'Annual Report.pdf',
            mimeType: 'application/pdf',
            parents: ['folder-123'],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'folder-123',
            name: 'Policies',
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['root-folder-1'],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'root-folder-1',
            name: 'Configured Root',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )

    const { resolveExclusionReviewAncestorChain } = await import(
      '@lib/exclusionReviewDrive'
    )

    await expect(resolveExclusionReviewAncestorChain('file-1')).resolves.toEqual([
      {
        driveId: 'root-folder-1',
        parentDriveId: null,
        itemType: 'folder',
        name: 'Configured Root',
        mimeType: 'application/vnd.google-apps.folder',
        driveUrl: 'https://drive.google.com/drive/folders/root-folder-1',
        path: [],
        depth: 0,
      },
      {
        driveId: 'folder-123',
        parentDriveId: 'root-folder-1',
        itemType: 'folder',
        name: 'Policies',
        mimeType: 'application/vnd.google-apps.folder',
        driveUrl: 'https://drive.google.com/drive/folders/folder-123',
        path: ['root-folder-1'],
        depth: 1,
      },
      {
        driveId: 'file-1',
        parentDriveId: 'folder-123',
        itemType: 'file',
        name: 'Annual Report.pdf',
        mimeType: 'application/pdf',
        driveUrl: 'https://drive.google.com/file/d/file-1/view',
        path: ['root-folder-1', 'folder-123'],
        depth: 2,
      },
    ])
  })

  it('resolves the ancestor chain through the configured root even when it is not the first parent', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'folder-123',
            name: 'Policies',
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['other-root', 'root-folder-1'],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'other-root',
            name: 'Other Root',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'root-folder-1',
            name: 'Configured Root',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )

    const { resolveExclusionReviewAncestorChain } = await import(
      '@lib/exclusionReviewDrive'
    )

    await expect(resolveExclusionReviewAncestorChain('folder-123')).resolves.toEqual([
      {
        driveId: 'root-folder-1',
        parentDriveId: null,
        itemType: 'folder',
        name: 'Configured Root',
        mimeType: 'application/vnd.google-apps.folder',
        driveUrl: 'https://drive.google.com/drive/folders/root-folder-1',
        path: [],
        depth: 0,
      },
      {
        driveId: 'folder-123',
        parentDriveId: 'root-folder-1',
        itemType: 'folder',
        name: 'Policies',
        mimeType: 'application/vnd.google-apps.folder',
        driveUrl: 'https://drive.google.com/drive/folders/folder-123',
        path: ['root-folder-1'],
        depth: 1,
      },
    ])
  })
})
