import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockFindMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    document_to_authors: {
      findMany: mockFindMany,
    },
  },
}))

import { getUniqueDocumentCountByAuthor } from '@lib/ready-for-library-author-metrics'

describe('getUniqueDocumentCountByAuthor', () => {
  afterEach(() => {
    mockFindMany.mockReset()
    vi.restoreAllMocks()
  })

  it('returns zero for a blank author name', async () => {
    await expect(getUniqueDocumentCountByAuthor('   ')).resolves.toBe(0)
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('counts distinct document links for the requested author', async () => {
    mockFindMany.mockResolvedValueOnce([
      { document_id: 'doc-1' },
      { document_id: 'doc-2' },
      { document_id: 'doc-3' },
    ])

    await expect(getUniqueDocumentCountByAuthor('Ryser, Rudolph C.')).resolves.toBe(3)

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        authors: {
          name: 'Ryser, Rudolph C.',
        },
      },
      distinct: ['document_id'],
      select: {
        document_id: true,
      },
    })
  })
})
