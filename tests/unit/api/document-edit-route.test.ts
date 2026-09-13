import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

const {
  mockGetDashboardSession,
  mockApplyDocumentEdit,
  mockGetDocumentDetail,
  MockDocumentEditNotFoundError,
  MockDocumentEditValidationError,
} = vi.hoisted(() => {
  class MockDocumentEditNotFoundError extends Error {}
  class MockDocumentEditValidationError extends Error {}

  return {
    mockGetDashboardSession: vi.fn(),
    mockApplyDocumentEdit: vi.fn(),
    mockGetDocumentDetail: vi.fn(),
    MockDocumentEditNotFoundError,
    MockDocumentEditValidationError,
  }
})

vi.mock('@root/auth', () => ({ getDashboardSession: mockGetDashboardSession }))
vi.mock('@lib/queries/documentEditQueries', () => ({
  applyDocumentEdit: mockApplyDocumentEdit,
  DocumentEditNotFoundError: MockDocumentEditNotFoundError,
  DocumentEditValidationError: MockDocumentEditValidationError,
}))
vi.mock('@lib/queries/documentQueries', () => ({ getDocumentDetail: mockGetDocumentDetail }))

import { PATCH } from '@api/documents/[id]/edit/route'

const context = { params: Promise.resolve({ id: 'doc-1' }) }

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/documents/doc-1/edit', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function invalidJsonRequest(): NextRequest {
  return new NextRequest('http://localhost/api/documents/doc-1/edit', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  })
}

describe('PATCH /api/documents/[id]/edit', () => {
  it('rejects unauthenticated requests', async () => {
    mockGetDashboardSession.mockResolvedValue(null)

    const response = await PATCH(request({}), context)

    expect(response.status).toBe(401)
    expect(mockApplyDocumentEdit).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON before invoking the mutation', async () => {
    mockGetDashboardSession.mockResolvedValue({ user: { email: 'editor@example.test' } })

    const response = await PATCH(invalidJsonRequest(), context)

    expect(response.status).toBe(400)
    expect(mockApplyDocumentEdit).not.toHaveBeenCalled()
  })

  it('maps validation errors to a bad request', async () => {
    mockGetDashboardSession.mockResolvedValue({ user: { email: 'editor@example.test' } })
    mockApplyDocumentEdit.mockRejectedValue(new MockDocumentEditValidationError('invalid'))

    const response = await PATCH(request({ snapshot: {} }), context)

    expect(response.status).toBe(400)
  })

  it('returns the committed detail after a successful edit', async () => {
    mockGetDashboardSession.mockResolvedValue({ user: { email: 'editor@example.test' } })
    mockApplyDocumentEdit.mockResolvedValue({ changed: true, changes: [{ fieldName: 'dc_title' }] })
    mockGetDocumentDetail.mockResolvedValue({ document: { id: 'doc-1' } })

    const body = {
      snapshot: {
        metadata: { dc_title: 'After' },
        quality: { comment: null, commentAdditional: null },
        tags: [],
        contributors: [],
        publishers: [],
      },
    }
    const response = await PATCH(request(body), context)

    expect(response.status).toBe(200)
    expect(mockApplyDocumentEdit).toHaveBeenCalledWith({
      documentId: 'doc-1',
      editorEmail: 'editor@example.test',
      snapshot: body.snapshot,
    })
    await expect(response.json()).resolves.toEqual({
      changed: true,
      changes: [{ fieldName: 'dc_title' }],
      detail: { document: { id: 'doc-1' } },
    })
  })
})
