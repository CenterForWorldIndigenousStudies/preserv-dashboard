import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockFindFirst, mockTransaction } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockTransaction: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    document_to_tags: {
      findFirst: mockFindFirst,
    },
    $transaction: mockTransaction,
  },
}))

vi.mock('@lib/editHistory', () => ({
  createEditHistoryEntry: vi.fn(),
}))

import { DELETE } from '@api/documents/[id]/tags/route'
import { getDocumentTagsPath } from '@constants/paths'

describe('document tags delete route', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('blocks protected system deletion while still using the document-tag endpoint', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'document-tag-1',
      document_id: 'doc-1',
      tag_id: 'tag-1',
      tags: {
        name: 'duplicate_document',
      },
    })

    const request = new NextRequest(`http://localhost${getDocumentTagsPath('doc-1')}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tagId: 'tag-1',
        deleteTagFromSystem: true,
      }),
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'doc-1' }),
    })
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(409)
    expect(payload.error).toBe('Tag "duplicate_document" is protected and cannot be deleted from the system.')
    expect(mockTransaction).not.toHaveBeenCalled()
  })
})
