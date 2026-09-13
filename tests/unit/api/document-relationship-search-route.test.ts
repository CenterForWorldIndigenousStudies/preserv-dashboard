import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

const { mockGetDashboardSession, mockSearchDocumentRelationships } = vi.hoisted(() => ({
  mockGetDashboardSession: vi.fn(),
  mockSearchDocumentRelationships: vi.fn(),
}))

vi.mock('@root/auth', () => ({ getDashboardSession: mockGetDashboardSession }))
vi.mock('@lib/queries/documentRelationshipQueries', () => ({
  searchDocumentRelationships: mockSearchDocumentRelationships,
}))

import { GET as getContributors } from '@api/contributors/search/route'
import { GET as getPublishers } from '@api/publishers/search/route'

describe('relationship search routes', () => {
  it('requires authentication', async () => {
    mockGetDashboardSession.mockResolvedValue(null)

    const response = await getContributors(new NextRequest('http://localhost/api/contributors/search?q=Ada'))

    expect(response.status).toBe(401)
    expect(mockSearchDocumentRelationships).not.toHaveBeenCalled()
  })

  it('uses the route-specific relationship kind', async () => {
    mockGetDashboardSession.mockResolvedValue({ user: { email: 'editor@example.test' } })
    mockSearchDocumentRelationships.mockResolvedValue([{ id: 'publisher-1', name: 'Example Press', notes: null }])

    const response = await getPublishers(new NextRequest('http://localhost/api/publishers/search?q=Press'))

    expect(response.status).toBe(200)
    expect(mockSearchDocumentRelationships).toHaveBeenCalledWith('publisher', 'Press')
    await expect(response.json()).resolves.toEqual({ items: [{ id: 'publisher-1', name: 'Example Press', notes: null }] })
  })
})
