import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPreservationCandidateDocumentIds: vi.fn(),
  getDocumentCollectionMembershipsByDocument: vi.fn(),
}))

vi.mock('@lib/queries/documentQuerySupport', async (importOriginal) => ({
  ...await importOriginal<object>(),
  getPreservationCandidateDocumentIds: mocks.getPreservationCandidateDocumentIds,
}))
vi.mock('@lib/queries/collectionMembershipQueries', async (importOriginal) => ({
  ...await importOriginal<object>(),
  getDocumentCollectionMembershipsByDocument: mocks.getDocumentCollectionMembershipsByDocument,
}))

import { getEligibleReadyForLibraryDocumentIds } from '@lib/queries/readyForLibraryQueries'

describe('selected Ready for Library eligibility', () => {
  it('checks only the requested IDs and requires approval, access and a mapped collection', async () => {
    mocks.getPreservationCandidateDocumentIds.mockResolvedValue(new Set(['approved', 'unmapped']))
    mocks.getDocumentCollectionMembershipsByDocument.mockResolvedValue(new Map([
      ['approved', [{ fedoraNodeId: '50' }]],
      ['unmapped', [{ fedoraNodeId: null }]],
    ]))
    const qualityFindMany = vi.fn().mockResolvedValue([
      { document_id: 'approved' },
      { document_id: 'unmapped' },
    ])
    const accessFindMany = vi.fn().mockResolvedValue([
      { document_id: 'approved', access_levels: { level_name: 'restricted' } },
      { document_id: 'unmapped', access_levels: { level_name: 'public' } },
    ])
    const client = {
      document_quality: { findMany: qualityFindMany },
      document_access: { findMany: accessFindMany },
      state_history: { findMany: vi.fn().mockResolvedValue([
        { document_id: 'approved', new_state: 'approved' },
        { document_id: 'unmapped', new_state: 'approved' },
      ]) },
    }

    const result = await getEligibleReadyForLibraryDocumentIds(
      ['approved', 'unmapped', 'not-approved'],
      client as never,
    )

    expect(result).toEqual(['approved'])
    expect(qualityFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { document_id: { in: ['approved', 'unmapped', 'not-approved'] }, validation_status: 'APPROVED' },
    }))
  })

  it('excludes a published document even if stale approval and candidate metadata remain', async () => {
    mocks.getPreservationCandidateDocumentIds.mockResolvedValue(new Set(['published']))
    mocks.getDocumentCollectionMembershipsByDocument.mockResolvedValue(new Map([
      ['published', [{ fedoraNodeId: '50' }]],
    ]))
    const client = {
      document_quality: { findMany: vi.fn().mockResolvedValue([{ document_id: 'published' }]) },
      document_access: { findMany: vi.fn().mockResolvedValue([
        { document_id: 'published', access_levels: { level_name: 'restricted' } },
      ]) },
      state_history: { findMany: vi.fn().mockResolvedValue([
        { document_id: 'published', new_state: 'ingested_fedora' },
      ]) },
    }

    expect(await getEligibleReadyForLibraryDocumentIds(['published'], client as never)).toEqual([])
  })

  it('rejects a source whose latest state lost approval after the table rendered', async () => {
    mocks.getPreservationCandidateDocumentIds.mockResolvedValue(new Set(['stale']))
    mocks.getDocumentCollectionMembershipsByDocument.mockResolvedValue(new Map([
      ['stale', [{ fedoraNodeId: '50' }]],
    ]))
    const client = {
      document_quality: { findMany: vi.fn().mockResolvedValue([{ document_id: 'stale' }]) },
      document_access: { findMany: vi.fn().mockResolvedValue([
        { document_id: 'stale', access_levels: { level_name: 'restricted' } },
      ]) },
      state_history: { findMany: vi.fn().mockResolvedValue([
        { document_id: 'stale', new_state: 'needs_review' },
        { document_id: 'stale', new_state: 'approved' },
      ]) },
    }

    expect(await getEligibleReadyForLibraryDocumentIds(['stale'], client as never)).toEqual([])
  })
})
