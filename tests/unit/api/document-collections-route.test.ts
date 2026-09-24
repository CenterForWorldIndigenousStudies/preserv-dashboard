import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetDashboardSession, mockGetDocumentDetail, mockUpdateDocumentCollectionTags } = vi.hoisted(() => ({
  mockGetDashboardSession: vi.fn(),
  mockGetDocumentDetail: vi.fn(),
  mockUpdateDocumentCollectionTags: vi.fn(),
}))

vi.mock('@root/auth', () => ({ getDashboardSession: mockGetDashboardSession }))
vi.mock('@lib/queries/documentQueries', () => ({ getDocumentDetail: mockGetDocumentDetail }))
vi.mock('@lib/queries/collectionQueries', () => ({
  getDistinctCollections: vi.fn(),
  updateDocumentCollectionTags: mockUpdateDocumentCollectionTags,
}))

import { PATCH } from '@api/documents/[id]/collections/route'
import { PATCH as patchLegacyDocument } from '@api/documents/[id]/route'

describe('document collections PATCH route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates collection associations through the collection endpoint', async () => {
    mockGetDashboardSession.mockResolvedValue({ user: { email: 'editor@example.test' } })
    mockGetDocumentDetail.mockResolvedValue({ document: { id: 'doc-1' } })
    mockUpdateDocumentCollectionTags.mockResolvedValue(true)

    const response = await PATCH(
      new NextRequest('http://localhost/api/documents/doc-1/collections', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ collection_tags: ['Collection A'] }),
      }),
      { params: Promise.resolve({ id: 'doc-1' }) },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: 'doc-1', collection_tags: ['Collection A'] })
    expect(mockUpdateDocumentCollectionTags).toHaveBeenCalledWith('doc-1', ['Collection A'])
  })

  it('requires authentication on the legacy document PATCH compatibility path', async () => {
    mockGetDashboardSession.mockResolvedValue(null)

    const response = await patchLegacyDocument(
      new NextRequest('http://localhost/api/documents/doc-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ collection_tags: ['Collection A'] }),
      }),
      { params: Promise.resolve({ id: 'doc-1' }) },
    )

    expect(response.status).toBe(401)
    expect(mockUpdateDocumentCollectionTags).not.toHaveBeenCalled()
  })
})
