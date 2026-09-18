import { describe, expect, it, vi } from 'vitest'

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    documents: { findUnique: vi.fn() },
    document_quality: { findUnique: vi.fn() },
    document_versions: { findMany: vi.fn() },
    document_to_metadata: { findMany: vi.fn() },
    document_to_batches: { findMany: vi.fn() },
    document_to_contributors: { findMany: vi.fn() },
    document_to_publishers: { findMany: vi.fn() },
    document_to_tags: { findMany: vi.fn() },
    version_groups: { findUnique: vi.fn() },
    document_access: { findMany: vi.fn() },
    state_history: { findMany: vi.fn() },
    edit_history: { findMany: vi.fn() },
  },
}))

vi.mock('@lib/editHistory', () => ({ createEditHistoryEntry: vi.fn() }))
vi.mock('@lib/db', () => ({ db: mockDb }))
vi.mock('@lib/needsReview', () => ({ composeReviewQueueReasons: vi.fn(() => []) }))
vi.mock('@lib/pipelineReadiness', () => ({ evaluateDocumentReadiness: vi.fn(() => Promise.resolve(null)) }))

import { getDocumentDetail, normalizeDocumentAccessLevels } from '@lib/queries/documentQueries'

describe('normalizeDocumentAccessLevels', () => {
  it('keeps only generated access levels, normalizes case, and sorts them alphabetically', () => {
    expect(normalizeDocumentAccessLevels(['RESTRICTED', ' ', null, 'internal', 'unknown'])).toEqual([
      'internal',
      'restricted',
    ])
  })
})

describe('getDocumentDetail audit history', () => {
  it('loads document-scoped edit history and exposes the editor and logical field', async () => {
    mockDb.documents.findUnique.mockResolvedValue({
      id: 'doc-1',
      filesize: 10n,
      hash_binary: null,
      hash_content: null,
      id_legacy: null,
      name: 'Document One',
      created_at: null,
      updated_at: null,
    })
    mockDb.document_quality.findUnique.mockResolvedValue(null)
    mockDb.document_versions.findMany.mockResolvedValue([])
    mockDb.document_to_metadata.findMany.mockResolvedValue([])
    mockDb.document_to_batches.findMany.mockResolvedValue([])
    mockDb.document_to_contributors.findMany.mockResolvedValue([])
    mockDb.document_to_publishers.findMany.mockResolvedValue([])
    mockDb.document_to_tags.findMany.mockResolvedValue([])
    mockDb.version_groups.findUnique.mockResolvedValue(null)
    mockDb.document_access.findMany.mockResolvedValue([])
    mockDb.state_history.findMany.mockResolvedValue([])
    mockDb.edit_history.findMany.mockResolvedValue([
      {
        id: 'edit-1',
        entity_id: 'doc-1',
        entity_table: 'documents',
        previous_value: JSON.stringify({ fieldName: 'dc_title', value: 'Before' }),
        new_value: JSON.stringify({ fieldName: 'dc_title', value: 'After' }),
        editor_email: 'editor@example.test',
        edit_summary: 'Changed document title.',
        edited_at: new Date('2026-09-11T12:00:00.000Z'),
      },
    ])

    const detail = await getDocumentDetail('doc-1')

    expect(mockDb.edit_history.findMany).toHaveBeenCalledWith({
      where: { entity_table: 'documents', entity_id: 'doc-1' },
      orderBy: [{ edited_at: 'desc' }, { id: 'desc' }],
    })
    expect(detail?.audits).toEqual([
      {
        document_id: 'doc-1',
        field_name: 'dc_title',
        source_name: 'Document Details',
        editor_email: 'editor@example.test',
        before_value: 'Before',
        after_value: 'After',
        changed_at: '2026-09-11T12:00:00.000Z',
      },
    ])
  })

  it('loads document state transitions in descending chronological order', async () => {
    mockDb.documents.findUnique.mockResolvedValue({
      id: 'doc-1',
      filesize: 10n,
      hash_binary: null,
      hash_content: null,
      id_legacy: null,
      name: 'Document One',
      created_at: null,
      updated_at: null,
    })
    mockDb.document_quality.findUnique.mockResolvedValue(null)
    mockDb.document_versions.findMany.mockResolvedValue([])
    mockDb.document_to_metadata.findMany.mockResolvedValue([])
    mockDb.document_to_batches.findMany.mockResolvedValue([])
    mockDb.document_to_contributors.findMany.mockResolvedValue([])
    mockDb.document_to_publishers.findMany.mockResolvedValue([])
    mockDb.document_to_tags.findMany.mockResolvedValue([])
    mockDb.version_groups.findUnique.mockResolvedValue(null)
    mockDb.document_access.findMany.mockResolvedValue([])
    mockDb.state_history.findMany.mockResolvedValue([
      {
        id: 'state-2',
        document_id: 'doc-1',
        previous_state: 'ingested',
        new_state: 'normalized',
        changed_at: new Date('2026-09-11T12:00:00.000Z'),
      },
    ])
    mockDb.edit_history.findMany.mockResolvedValue([])

    const detail = await getDocumentDetail('doc-1')

    expect(mockDb.state_history.findMany).toHaveBeenCalledWith({
      where: { document_id: 'doc-1' },
      orderBy: [{ changed_at: 'desc' }, { id: 'desc' }],
    })
    expect(detail?.state_history).toEqual([
      {
        id: 'state-2',
        document_id: 'doc-1',
        previous_state: 'ingested',
        new_state: 'normalized',
        changed_at: '2026-09-11T12:00:00.000Z',
      },
    ])
  })
})
