import { afterAll, afterEach, beforeAll, describe, it, expect, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock the Prisma client via vi.hoisted() — ensures mocks are available at
// module scope before vi.mock() hoists the factory
// ---------------------------------------------------------------------------
const { mockFindMany, mockCount } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
}))

vi.mock('@lib/db', () => ({
  db: {
    documents: {
      findMany: mockFindMany,
      count: mockCount,
    },
  },
}))

import { getAllDocuments, getDocuments } from '@lib/queries'

// ---------------------------------------------------------------------------
// Shared call inspection helpers
// ---------------------------------------------------------------------------
interface PrismaCall {
  where?: { OR?: Array<Record<string, { contains: string }>> }
  skip?: number
  take?: number
  orderBy?: Record<string, 'asc' | 'desc'>
}

function findOrCall(): PrismaCall {
  return mockFindMany.mock.calls[0][0] as PrismaCall
}

function findOrCallWith(): PrismaCall {
  for (const c of mockFindMany.mock.calls) {
    const call = c[0] as PrismaCall
    if (call?.where?.OR) return call
  }
  return mockFindMany.mock.calls[0][0] as PrismaCall
}

// ---------------------------------------------------------------------------
// buildSearchWhere — verify search logic via getAllDocuments OR clause
// ---------------------------------------------------------------------------
describe('buildSearchWhere (via getAllDocuments)', () => {
  beforeAll(() => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('returns empty where when search is undefined', async () => {
    await getAllDocuments({ search: undefined })
    const call = findOrCall()
    expect(call.where).toEqual({})
  })

  it('returns empty where when search is only whitespace', async () => {
    mockFindMany.mockClear()
    await getAllDocuments({ search: '   ' })
    const call = findOrCall()
    expect(call.where).toEqual({})
  })

  it('applies OR clause with all searchable fields', async () => {
    mockFindMany.mockClear()
    mockCount.mockClear()
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await getAllDocuments({ search: 'test' })

    const call = findOrCallWith()
    expect(call.where).toHaveProperty('OR')
    const orClause = call.where?.OR as Array<Record<string, unknown>>
    const fieldNames = orClause.map((f) => Object.keys(f)[0])
    expect(fieldNames).toEqual(['name', 'source_id', 'hash_binary', 'hash_content', 'id_legacy'])
  })

  it('trims search term before applying filter', async () => {
    mockFindMany.mockClear()
    mockCount.mockClear()
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await getAllDocuments({ search: '  trimmed  ' })

    const call = findOrCallWith()
    const orClause = call.where?.OR as Array<Record<string, { contains: string }>>
    orClause.forEach((clause) => {
      const field = Object.values(clause)[0] as { contains: string }
      expect(field.contains).toBe('trimmed')
    })
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
  }

  beforeAll(() => {
    mockFindMany.mockResolvedValue([defaultRow])
    mockCount.mockResolvedValue(1)
  })

  afterEach(() => {
    mockFindMany.mockClear()
    mockCount.mockClear()
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('uses default pagination (page 1, pageSize 25)', async () => {
    mockFindMany.mockResolvedValue([defaultRow])
    mockCount.mockResolvedValue(1)

    await getAllDocuments()

    const call = findOrCall()
    expect(call.skip).toBe(0)
    expect(call.take).toBe(25)
  })

  it('respects custom page and pageSize', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await getAllDocuments({ page: 3, pageSize: 10 })

    const call = findOrCall()
    expect(call.skip).toBe(20) // (3-1) * 10
    expect(call.take).toBe(10)
  })

  it('caps pageSize at 1000', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await getAllDocuments({ pageSize: 5000 })

    const call = findOrCall()
    expect(call.take).toBe(1000)
  })

  it('orders by created_at desc by default', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await getAllDocuments()

    const call = findOrCall()
    expect(call.orderBy).toEqual({ created_at: 'desc' })
  })

  it('respects orderBy and sortDirection', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await getAllDocuments({ orderBy: 'name', sortDirection: 'asc' })

    const call = findOrCall()
    expect(call.orderBy).toEqual({ name: 'asc' })
  })

  it('respects sortDirection desc', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await getAllDocuments({ orderBy: 'filesize', sortDirection: 'desc' })

    const call = findOrCall()
    expect(call.orderBy).toEqual({ filesize: 'desc' })
  })

  it('applies search filter via OR clause', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await getAllDocuments({ search: 'test' })

    const call = findOrCall()
    expect(call.where).toHaveProperty('OR')
  })

  it('returns data array and total count', async () => {
    const row = { ...defaultRow, id: 'doc-1', name: 'Test Document' }
    mockFindMany.mockResolvedValue([row])
    mockCount.mockResolvedValue(1)

    const result = await getAllDocuments()

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('total')
    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
  })

  it('maps filesize BigInt to number', async () => {
    const row = {
      ...defaultRow,
      id: 'doc-2',
      filesize: BigInt(2048),
      name: 'File.pdf',
    }
    mockFindMany.mockResolvedValue([row])
    mockCount.mockResolvedValue(1)

    const result = await getAllDocuments()

    expect(result.data[0].filesize).toBe(2048)
  })

  it('handles null filesize', async () => {
    const row = { ...defaultRow, id: 'doc-3', filesize: null }
    mockFindMany.mockResolvedValue([row])
    mockCount.mockResolvedValue(1)

    const result = await getAllDocuments()

    expect(result.data[0].filesize).toBeNull()
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
  }

  beforeAll(() => {
    mockFindMany.mockResolvedValue([defaultRow])
    mockCount.mockResolvedValue(1)
  })

  afterEach(() => {
    mockFindMany.mockClear()
    mockCount.mockClear()
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('uses PAGE_SIZE of 20 with offset pagination', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await getDocuments({ page: 2 })

    const call = findOrCall()
    expect(call.skip).toBe(20) // (2-1) * 20
    expect(call.take).toBe(20)
  })

  it('orders by created_at desc', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await getDocuments()

    const call = findOrCall()
    expect(call.orderBy).toEqual({ created_at: 'desc' })
  })

  it('returns items array and total count', async () => {
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
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('normalizes page < 1 to 1', async () => {
    mockFindMany.mockClear()
    await getAllDocuments({ page: 0 })
    const call = findOrCall()
    expect(call.skip).toBe(0)
  })

  it('normalizes negative page to 1', async () => {
    mockFindMany.mockClear()
    await getAllDocuments({ page: -5 })
    const call = findOrCall()
    expect(call.skip).toBe(0)
  })

  it('normalizes NaN page to 1', async () => {
    mockFindMany.mockClear()
    await getAllDocuments({ page: NaN })
    const call = findOrCall()
    expect(call.skip).toBe(0)
  })
})
