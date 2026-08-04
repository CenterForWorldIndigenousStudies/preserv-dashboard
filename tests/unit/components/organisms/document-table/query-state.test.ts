import { describe, expect, it } from 'vitest'

import {
  applyDocumentTablePageSize,
  applyDocumentTableSearch,
  applyDocumentTableSorting,
  applyNextDocumentTableCursor,
  buildInitialDocumentTableSorting,
} from '../../../../../components/organisms/DocumentTable/query-state'

describe('document table query state helpers', () => {
  const baseQuery = {
    page: 3,
    pageSize: 25,
    search: undefined,
    orderBy: undefined,
    sortDirection: undefined,
    cursorValue: 'cursor-value',
    cursorId: 'cursor-id',
    cursorDirection: 'next' as const,
    filters: { batch: undefined as string | undefined },
  }

  it('builds initial sorting from the incoming query', () => {
    expect(
      buildInitialDocumentTableSorting({
        ...baseQuery,
        orderBy: 'name',
        sortDirection: 'desc',
      }),
    ).toEqual([{ id: 'name', desc: true }])
  })

  it('resets cursor state when search changes', () => {
    expect(applyDocumentTableSearch(baseQuery, 'tribal')).toEqual({
      ...baseQuery,
      page: 1,
      search: 'tribal',
      cursorValue: undefined,
      cursorId: undefined,
      cursorDirection: undefined,
    })
  })

  it('resets cursor state when page size changes', () => {
    expect(applyDocumentTablePageSize(baseQuery, 100)).toEqual({
      ...baseQuery,
      page: 1,
      pageSize: 100,
      cursorValue: undefined,
      cursorId: undefined,
      cursorDirection: undefined,
    })
  })

  it('maps MRT sorting into query ordering fields', () => {
    expect(applyDocumentTableSorting(baseQuery, [{ id: 'updated_at', desc: true }])).toEqual({
      ...baseQuery,
      page: 1,
      orderBy: 'updated_at',
      sortDirection: 'desc',
      cursorValue: undefined,
      cursorId: undefined,
      cursorDirection: undefined,
    })
  })

  it('advances cursor pagination with the next cursor', () => {
    expect(
      applyNextDocumentTableCursor(baseQuery, {
        id: 'doc-2',
        value: 'Bravo',
      }),
    ).toEqual({
      ...baseQuery,
      page: 4,
      cursorValue: 'Bravo',
      cursorId: 'doc-2',
      cursorDirection: 'next',
    })
  })
})
