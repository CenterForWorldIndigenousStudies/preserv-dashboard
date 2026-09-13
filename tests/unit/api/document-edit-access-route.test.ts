import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

const {
  mockGetDashboardSession,
  mockAuthorizeDocumentEditing,
  mockGetDocumentDetail,
  MockDocumentEditNotFoundError,
  MockDocumentEditValidationError,
} = vi.hoisted(() => {
  class MockDocumentEditNotFoundError extends Error {}
  class MockDocumentEditValidationError extends Error {}

  return {
    mockGetDashboardSession: vi.fn(),
    mockAuthorizeDocumentEditing: vi.fn(),
    mockGetDocumentDetail: vi.fn(),
    MockDocumentEditNotFoundError,
    MockDocumentEditValidationError,
  }
})

vi.mock('@root/auth', () => ({ getDashboardSession: mockGetDashboardSession }))
vi.mock('@lib/queries/documentEditQueries', () => ({
  authorizeDocumentEditing: mockAuthorizeDocumentEditing,
  DocumentEditNotFoundError: MockDocumentEditNotFoundError,
  DocumentEditValidationError: MockDocumentEditValidationError,
}))
vi.mock('@lib/queries/documentQueries', () => ({ getDocumentDetail: mockGetDocumentDetail }))

import { POST } from '@api/documents/[id]/edit-access/route'

const context = { params: Promise.resolve({ id: 'doc-1' }) }

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/documents/doc-1/edit-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/documents/[id]/edit-access', () => {
  it('requires authentication and a reason', async () => {
    mockGetDashboardSession.mockResolvedValue(null)
    expect((await POST(request({ reason: 'Because' }), context)).status).toBe(401)

    mockGetDashboardSession.mockResolvedValue({ user: { email: 'editor@example.test' } })
    expect((await POST(request({}), context)).status).toBe(400)
    expect(mockAuthorizeDocumentEditing).not.toHaveBeenCalled()
  })

  it('authorizes editing and returns the refreshed detail', async () => {
    mockGetDashboardSession.mockResolvedValue({ user: { email: 'editor@example.test' } })
    mockAuthorizeDocumentEditing.mockResolvedValue({
      changed: true,
      previousState: 'approved',
      newState: 'needs_review',
    })
    mockGetDocumentDetail.mockResolvedValue({ document: { id: 'doc-1' } })

    const response = await POST(request({ reason: 'Correct the published title.' }), context)

    expect(response.status).toBe(200)
    expect(mockAuthorizeDocumentEditing).toHaveBeenCalledWith({
      documentId: 'doc-1',
      editorEmail: 'editor@example.test',
      reason: 'Correct the published title.',
    })
    await expect(response.json()).resolves.toEqual({
      changed: true,
      previousState: 'approved',
      newState: 'needs_review',
      detail: { document: { id: 'doc-1' } },
    })
  })
})
