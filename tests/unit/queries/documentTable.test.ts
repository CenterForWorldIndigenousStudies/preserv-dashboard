import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockQueryRaw } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    $queryRaw: mockQueryRaw,
  },
}))

vi.mock('@lib/editHistory', () => ({
  createEditHistoryEntry: vi.fn(),
}))

import { getAllDocuments, getNeedsReviewDocuments, normalizeDocumentTablePageSize } from '@lib/queries/queries'

interface PrismaSqlCall {
  strings: string[]
  values: unknown[]
}

function queryCall(index = 0): PrismaSqlCall {
  return mockQueryRaw.mock.calls[index][0] as PrismaSqlCall
}

function queryText(index = 0): string {
  return queryCall(index).strings.join(' ')
}

function expectDefaultOrderBy(sql: string): void {
  expect(sql).toContain('ORDER BY')
  expect(sql).toContain("COALESCE(d.name, '') ASC")
  expect(sql).toContain("COALESCE(d.updated_at, TIMESTAMP('1000-01-01 00:00:00')) ASC")
  expect(sql).toContain('d.id ASC')
}

const DEFAULT_ROW = {
  id: 'doc-1',
  filesize: null,
  hash_binary: null,
  hash_content: null,
  id_legacy: null,
  source_id: null,
  name: 'Alpha document',
  validation_status: null,
  validation_timestamp: null,
  validator_name: null,
  created_at: null,
  updated_at: new Date('2026-05-01T12:00:00.000Z'),
  is_duplicate: 0,
  sort_value: 'Alpha document',
}

describe('document table query normalization', () => {
  afterEach(() => {
    mockQueryRaw.mockReset()
  })

  it('normalizes page sizes to the supported document table values', () => {
    expect(normalizeDocumentTablePageSize()).toBe(25)
    expect(normalizeDocumentTablePageSize(10)).toBe(25)
    expect(normalizeDocumentTablePageSize(75)).toBe(50)
    expect(normalizeDocumentTablePageSize(999)).toBe(500)
  })

  it('applies the normalized page size to overview queries', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ pageSize: 75 })

    expect(queryCall(0).values.at(-1)).toBe(51)
  })
})

describe('document table default ordering', () => {
  afterEach(() => {
    mockQueryRaw.mockReset()
  })

  it('orders overview queries by name, updated_at, then id when no sort is supplied', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments()

    expectDefaultOrderBy(queryText(0))
  })

  it('serializes and reuses the default overview cursor ordering', async () => {
    mockQueryRaw.mockResolvedValueOnce([DEFAULT_ROW])

    const result = await getAllDocuments()
    const endCursor = result.pageInfo.endCursor

    expect(endCursor).toEqual({
      id: 'doc-1',
      value: JSON.stringify({
        primary: 'Alpha document',
        secondary: '2026-05-01T12:00:00.000Z',
      }),
    })

    mockQueryRaw.mockResolvedValueOnce([])
    await getAllDocuments({
      cursorValue: endCursor?.value,
      cursorId: endCursor?.id,
    })

    const sql = queryText(1)
    expect(sql).toContain("COALESCE(d.name, '') >")
    expect(sql).toContain("COALESCE(d.updated_at, TIMESTAMP('1000-01-01 00:00:00')) >")
    expect(sql).toContain('AND d.id >')
  })

  it('uses the same default ordering for needs-review document queries', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getNeedsReviewDocuments()

    expectDefaultOrderBy(queryText(0))
  })
})
