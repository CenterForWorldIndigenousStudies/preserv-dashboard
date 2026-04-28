import { afterAll, afterEach, beforeAll, describe, it, expect, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock the Prisma client via vi.hoisted() — ensures mocks are available at
// module scope before vi.mock() hoists the factory
// ---------------------------------------------------------------------------
const { mockQueryRaw } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    $queryRaw: mockQueryRaw,
  },
}))

import { getAllDocuments, getDocuments } from '@lib/queries'

// ---------------------------------------------------------------------------
// Shared call inspection helpers
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// buildSearchWhere — verify search logic via getAllDocuments OR clause
// ---------------------------------------------------------------------------
describe('buildSearchWhere (via getAllDocuments)', () => {
  beforeAll(() => {
    mockQueryRaw.mockResolvedValueOnce([])
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('returns empty where when search is undefined', async () => {
    await getAllDocuments({ search: undefined })
    expect(queryText(0)).not.toContain('WHERE (')
  })

  it('returns empty where when search is only whitespace', async () => {
    mockQueryRaw.mockReset()
    mockQueryRaw.mockResolvedValueOnce([])
    await getAllDocuments({ search: '   ' })
    expect(queryText(0)).not.toContain('WHERE (')
  })

  it('applies OR clause with all searchable fields', async () => {
    mockQueryRaw.mockReset()
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ search: 'test' })

    const sql = queryText(0)
    expect(sql).toContain('d.name LIKE')
    expect(sql).toContain('d.hash_binary LIKE')
    expect(sql).toContain('d.hash_content LIKE')
    expect(sql).toContain('d.id_legacy LIKE')
  })

  it('trims search term before applying filter', async () => {
    mockQueryRaw.mockReset()
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ search: '  trimmed  ' })

    const call = queryCall(0)
    expect(call.values.slice(0, 4)).toEqual(['%trimmed%', '%trimmed%', '%trimmed%', '%trimmed%'])
  })
})

// ---------------------------------------------------------------------------
// getAllDocuments — mocks Prisma, tests query-building logic
// ---------------------------------------------------------------------------
describe('getAllDocuments', () => {
  const defaultRow = {
    id: 'doc-1',
    filesize: null,
    hash_binary: null,
    hash_content: null,
    id_legacy: null,
    source_id: null,
    name: null,
    created_at: null,
    updated_at: null,
    is_duplicate: 0,
  }

  beforeAll(() => {
    mockQueryRaw.mockResolvedValueOnce([defaultRow])
  })

  afterEach(() => {
    mockQueryRaw.mockReset()
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('uses default pageSize of 25', async () => {
    mockQueryRaw.mockResolvedValueOnce([defaultRow])

    await getAllDocuments()

    const call = queryCall(0)
    expect(call.values.at(-1)).toBe(26)
  })

  it('respects custom pageSize', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ page: 3, pageSize: 10 })

    const call = queryCall(0)
    expect(call.values.at(-1)).toBe(11)
  })

  it('caps pageSize at 1000', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ pageSize: 5000 })

    const call = queryCall(0)
    expect(call.values.at(-1)).toBe(1001)
  })

  it('orders by created_at desc by default', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments()

    expect(queryText(0)).toContain("ORDER BY COALESCE(d.created_at, TIMESTAMP('1000-01-01 00:00:00')) DESC, d.id ASC")
  })

  it('respects orderBy and sortDirection', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ orderBy: 'name', sortDirection: 'asc' })

    expect(queryText(0)).toContain("ORDER BY COALESCE(d.name, '') ASC, d.id ASC")
  })

  it('supports sorting by source_id', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ orderBy: 'source_id', sortDirection: 'asc' })

    expect(queryText(0)).toContain("ORDER BY COALESCE(JSON_UNQUOTE(JSON_EXTRACT(source_meta.value, '$.value')), JSON_UNQUOTE(JSON_EXTRACT(source_meta.value, '$')), source_meta.value, '') ASC, d.id ASC")
  })

  it('supports sorting by is_duplicate', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getAllDocuments({ orderBy: 'is_duplicate', sortDirection: 'desc' })

    expect(queryText(0)).toContain('ORDER BY CASE WHEN dup.document_id IS NULL THEN 0 ELSE 1 END DESC')
  })

  it('returns data array and pageInfo', async () => {
    const row = { ...defaultRow, id: 'doc-1', name: 'Test Document' }
    mockQueryRaw.mockResolvedValueOnce([row])

    const result = await getAllDocuments()

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('pageInfo')
    expect(result.data).toHaveLength(1)
    expect(result.pageInfo.page).toBe(1)
  })

  it('maps filesize BigInt to number', async () => {
    const row = {
      ...defaultRow,
      id: 'doc-2',
      filesize: BigInt(2048),
      name: 'File.pdf',
    }
    mockQueryRaw.mockResolvedValueOnce([row])

    const result = await getAllDocuments()

    expect(result.data[0].filesize).toBe(2048)
  })

  it('handles null filesize', async () => {
    const row = { ...defaultRow, id: 'doc-3', filesize: null }
    mockQueryRaw.mockResolvedValueOnce([row])

    const result = await getAllDocuments()

    expect(result.data[0].filesize).toBeNull()
  })

  it('maps source_id and duplicate flag', async () => {
    const row = { ...defaultRow, source_id: 'SRC-42', is_duplicate: 1 }
    mockQueryRaw.mockResolvedValueOnce([row])

    const result = await getAllDocuments()

    expect(result.data[0].source_id).toBe('SRC-42')
    expect(result.data[0].is_duplicate).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getDocuments — mocks Prisma
// ---------------------------------------------------------------------------
describe('getDocuments', () => {
  const defaultRow = {
    id: 'doc-1',
    filesize: null,
    hash_binary: null,
    hash_content: null,
    id_legacy: null,
    source_id: null,
    name: null,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: null,
    is_duplicate: 0,
  }

  beforeAll(() => {
    mockQueryRaw.mockResolvedValueOnce([defaultRow])
  })

  afterEach(() => {
    mockQueryRaw.mockReset()
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('uses PAGE_SIZE of 20', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getDocuments({ page: 2 })

    const call = queryCall(0)
    expect(call.values.at(-1)).toBe(21)
  })

  it('orders by created_at desc', async () => {
    mockQueryRaw.mockResolvedValueOnce([])

    await getDocuments()

    expect(queryText(0)).toContain("ORDER BY COALESCE(d.created_at, TIMESTAMP('1000-01-01 00:00:00')) DESC, d.id ASC")
  })

  it('returns items array and total count', async () => {
    mockQueryRaw.mockResolvedValueOnce([defaultRow])

    const result = await getDocuments()

    expect(result).toHaveProperty('items')
    expect(result).toHaveProperty('total')
    expect(Array.isArray(result.items)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Normalize page number edge cases
// ---------------------------------------------------------------------------
describe('page number normalization', () => {
  beforeAll(() => {
    mockQueryRaw.mockResolvedValueOnce([])
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('normalizes page < 1 to 1', async () => {
    mockQueryRaw.mockReset()
    mockQueryRaw.mockResolvedValueOnce([])
    await getAllDocuments({ page: 0 })
    const call = queryCall(0)
    expect(call.values.at(-1)).toBe(26)
  })

  it('normalizes negative page to 1', async () => {
    mockQueryRaw.mockReset()
    mockQueryRaw.mockResolvedValueOnce([])
    await getAllDocuments({ page: -5 })
    const call = queryCall(0)
    expect(call.values.at(-1)).toBe(26)
  })

  it('normalizes NaN page to 1', async () => {
    mockQueryRaw.mockReset()
    mockQueryRaw.mockResolvedValueOnce([])
    await getAllDocuments({ page: NaN })
    const call = queryCall(0)
    expect(call.values.at(-1)).toBe(26)
  })
})
