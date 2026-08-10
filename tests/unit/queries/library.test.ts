import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockQueryRaw, mockTagsFindMany } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
  mockTagsFindMany: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    $queryRaw: mockQueryRaw,
    tags: { findMany: mockTagsFindMany },
  },
}))
vi.mock('@lib/editHistory', () => ({ createEditHistoryEntry: vi.fn() }))

import {
  getLibraryDocuments,
  normalizeLibraryDocument,
  normalizeRawLibraryMetadataValue,
  selectLatestLibraryBatch,
} from '@lib/queries/queries'

function queryText(index = 0): string {
  const call = mockQueryRaw.mock.calls[index]?.[0] as { strings: string[] } | undefined
  return call?.strings.join(' ') ?? ''
}

describe('Library query helpers', () => {
  it('selects the batch with the newest document association', () => {
    const associations = [
      {
        batchId: 'batch-old',
        batchName: 'Old batch',
        addedAt: '2026-01-01T00:00:00.000Z',
        batchCreatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        batchId: 'batch-new',
        batchName: 'New batch',
        addedAt: '2026-02-01T00:00:00.000Z',
        batchCreatedAt: '2026-02-01T00:00:00.000Z',
      },
    ]

    expect(selectLatestLibraryBatch(associations)?.batchId).toBe('batch-new')
  })

  it('puts null association timestamps last and uses batch creation time and id as tie breakers', () => {
    const associations = [
      {
        batchId: 'batch-z',
        batchName: null,
        addedAt: null,
        batchCreatedAt: '2026-03-01T00:00:00.000Z',
      },
      {
        batchId: 'batch-a',
        batchName: null,
        addedAt: '2026-03-01T00:00:00.000Z',
        batchCreatedAt: '2026-03-01T00:00:00.000Z',
      },
      {
        batchId: 'batch-b',
        batchName: null,
        addedAt: '2026-03-01T00:00:00.000Z',
        batchCreatedAt: '2026-03-01T00:00:00.000Z',
      },
    ]

    expect(selectLatestLibraryBatch(associations)?.batchId).toBe('batch-b')
  })

  it('normalizes nullable and numeric database values at the Library boundary', () => {
    expect(
      normalizeLibraryDocument({
        id: 'doc-1',
        legacyId: 'legacy-1',
        sourceId: 'source-1',
        name: null,
        fedoraUrl: null,
        uploadedAt: 1770000000,
        collections: [{ id: 'collection-1', name: 'Collection 1' }],
        batch: {
          id: 'batch-1',
          name: null,
          createdAt: 1770000001,
        },
      }),
    ).toEqual({
      id: 'doc-1',
      legacyId: 'legacy-1',
      sourceId: 'source-1',
      name: null,
      fedoraUrl: null,
      uploadedAt: new Date(1770000000).toISOString(),
      collections: [{ id: 'collection-1', name: 'Collection 1' }],
      batch: {
        id: 'batch-1',
        name: null,
        createdAt: new Date(1770000001).toISOString(),
      },
    })
  })

  it('converts raw long-text database buffers before metadata parsing', () => {
    expect(normalizeRawLibraryMetadataValue(Buffer.from('{"value":"https://fedora.example/doc-1"}'))).toBe(
      '{"value":"https://fedora.example/doc-1"}',
    )
  })

  it('serializes already-parsed metadata objects before metadata parsing', () => {
    expect(normalizeRawLibraryMetadataValue({ value: 'https://fedora.example/doc-2' })).toBe(
      '{"value":"https://fedora.example/doc-2"}',
    )
  })
})

describe('getLibraryDocuments', () => {
  beforeEach(() => {
    mockQueryRaw.mockReset()
    mockTagsFindMany.mockReset()
    mockTagsFindMany.mockResolvedValue([])
  })

  it('uses the current document state-history row and keeps the upload state as a fixed condition', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ total: 1 }]).mockResolvedValueOnce([])

    await getLibraryDocuments()

    const sql = queryText(0)
    expect(sql).toContain('INNER JOIN document_quality dq ON dq.document_id = d.id')
    expect(sql).toContain('INNER JOIN state_history latest_state ON latest_state.id = dq.current_status')
    expect(sql).toContain('latest_state.new_state =')
    expect(sql).not.toContain('fedora_meta.value IS NOT NULL')
  })

  it('applies the full Advanced Search filter set in SQL', async () => {
    mockTagsFindMany.mockResolvedValue([{ id: 'tag-1', name: 'collection-tag', notes: null }])
    mockQueryRaw.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([])

    await getLibraryDocuments({
      author: 'Matching Author',
      tag: 'collection-tag',
      statuses: ['APPROVED'],
      documentType: 'duplicate',
      batch: 'batch-2026',
      createdFrom: '2026-04-01',
      createdTo: '2026-04-30',
      collection: 'Collection A',
      accessLevel: 'public',
    })

    const sql = queryText(0)
    expect(sql).toContain('FROM document_to_authors dta')
    expect(sql).toContain('FROM document_to_tags dtt')
    expect(sql).toContain('FROM document_to_batches filtered_dtb')
    expect(sql).toContain('FROM document_to_batches latest_dtb')
    expect(sql).toContain('d.created_at >=')
    expect(sql).toContain('d.created_at < DATE_ADD')
    expect(sql).toContain('LOWER(t.name)')
    expect(sql).toContain('LOWER(al.level_name)')
    expect(sql).toContain('dup.document_id IS NOT NULL')
  })
})
