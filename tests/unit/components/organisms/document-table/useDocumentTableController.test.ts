import { describe, expectTypeOf, it } from 'vitest'

import type {
  DocumentTableFetchResult,
  DocumentTableFetcher,
  DocumentTableQuery,
  DocumentTableSelectionState,
} from '@components/organisms/document-table/types'
import type { Document } from '@lib/types'

describe('document table contract', () => {
  it('supports caller supplied fetchers and cursor page info', () => {
    type Filters = { batch?: string }
    type Fetcher = DocumentTableFetcher<Document, Filters>

    expectTypeOf<Fetcher>().toBeFunction()
    expectTypeOf<DocumentTableQuery<Filters>>().toMatchTypeOf<{
      page: number
      pageSize: number
      search?: string
      orderBy?: string
      sortDirection?: 'asc' | 'desc'
      filters: { batch?: string }
    }>()
    expectTypeOf<DocumentTableFetchResult<Document>>().toMatchTypeOf<{
      data: Document[]
      pageInfo: {
        pageSize: number
        hasNextPage: boolean
        hasPreviousPage: boolean
      }
    }>()
    expectTypeOf<DocumentTableSelectionState>().toMatchTypeOf<{
      selectedRowIds: Record<string, boolean>
    }>()
  })
})
