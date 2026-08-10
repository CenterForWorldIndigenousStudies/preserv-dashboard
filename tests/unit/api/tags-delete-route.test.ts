import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockDeleteTag, mockDeleteTagAndDocumentAssociations } = vi.hoisted(() => ({
  mockDeleteTag: vi.fn(),
  mockDeleteTagAndDocumentAssociations: vi.fn(),
}))

vi.mock('@lib/queries/queries', () => ({
  deleteTag: mockDeleteTag,
  deleteTagAndDocumentAssociations: mockDeleteTagAndDocumentAssociations,
}))

import { DELETE } from '@api/tags/[id]/route'
import { TAGS_PATH } from '@constants/paths'

describe('tag delete route', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns a friendly conflict message when a protected tag deletion is attempted', async () => {
    mockDeleteTag.mockRejectedValue(
      new Error('Tag "duplicate_document" is protected and cannot be deleted from the system.'),
    )

    const request = new NextRequest(`http://localhost${TAGS_PATH}/tag-1`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cascade: false }),
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'tag-1' }),
    })
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(409)
    expect(payload.error).toBe('Tag "duplicate_document" is protected and cannot be deleted from the system.')
  })
})
