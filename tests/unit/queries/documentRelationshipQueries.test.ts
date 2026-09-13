import { describe, expect, it, vi } from 'vitest'

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    contributors: { findMany: vi.fn() },
    publishers: { findMany: vi.fn() },
  },
}))

vi.mock('@lib/db', () => ({ db: mockDb }))

import { searchDocumentRelationships } from '@lib/queries/documentRelationshipQueries'

describe('searchDocumentRelationships', () => {
  it('returns no results for a blank or too-short search', async () => {
    await expect(searchDocumentRelationships('contributor', ' ')).resolves.toEqual([])
    expect(mockDb.contributors.findMany).not.toHaveBeenCalled()
  })

  it('searches contributors by name', async () => {
    mockDb.contributors.findMany.mockResolvedValue([{ id: 'contributor-1', name: 'Ada Example', notes: 'Author' }])

    await expect(searchDocumentRelationships('contributor', 'Ada')).resolves.toEqual([
      { id: 'contributor-1', name: 'Ada Example', notes: 'Author' },
    ])
    expect(mockDb.contributors.findMany).toHaveBeenCalledWith({
      where: { name: { contains: 'Ada' } },
      orderBy: { name: 'asc' },
      take: 20,
      select: { id: true, name: true, notes: true },
    })
  })

  it('searches publishers from the publishers table', async () => {
    mockDb.publishers.findMany.mockResolvedValue([{ id: 'publisher-1', name: 'Example Press', notes: null }])

    await expect(searchDocumentRelationships('publisher', 'Press')).resolves.toEqual([
      { id: 'publisher-1', name: 'Example Press', notes: null },
    ])
  })
})
