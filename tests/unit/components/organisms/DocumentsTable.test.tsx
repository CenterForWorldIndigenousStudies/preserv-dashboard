import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FilterOptions } from '@lib/search'

const mocks = vi.hoisted(() => ({
  documentTableProps: undefined as Record<string, unknown> | undefined,
  state: {
    accessLevel: undefined,
    batch: undefined,
    collection: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    documentType: 'all',
    globalFilter: '',
    pathname: '/documents',
    page: 1,
    pageSize: 25,
    queryParams: { page: 1, pageSize: 25 },
    searchParams: new URLSearchParams(),
    statuses: undefined,
    tag: undefined,
    setGlobalFilter: vi.fn(),
    setOverviewFilters: vi.fn(),
    setPageSize: vi.fn(),
    setSorting: vi.fn(),
    sorting: [],
    goToNextPage: vi.fn(),
    goToPreviousPage: vi.fn(),
  },
}))

vi.mock('@hooks/useOverviewTableState', () => ({
  useOverviewTableState: () => mocks.state,
}))

vi.mock('@organisms/DocumentTable/DocumentTable', () => ({
  DocumentTable: (props: Record<string, unknown>) => {
    mocks.documentTableProps = props
    return <div data-testid="document-table">Document table</div>
  },
}))

import { DocumentsTable } from '@organisms/DocumentsTable'

const filterOptions: FilterOptions = {
  collections: ['Collection A'],
  accessLevels: ['public', 'restricted', 'internal', 'admin', 'confidential'],
  statuses: ['APPROVED', 'NEEDS_REVIEW'],
}

describe('DocumentsTable adapter', () => {
  afterEach(() => {
    mocks.documentTableProps = undefined
    vi.clearAllMocks()
  })

  it('supplies the overview configuration to the shared table shell', () => {
    renderToStaticMarkup(<DocumentsTable filterOptions={filterOptions} />)

    const config = mocks.documentTableProps?.config as {
      definition: { tableId: string }
      advancedSearch?: unknown
      rowActions?: Array<{ id: string }>
      enableRowSelection?: boolean
    }

    expect(config.definition.tableId).toBe('overview-documents')
    expect(config.advancedSearch).toBeDefined()
    expect(config.rowActions).toBeUndefined()
    expect(config.enableRowSelection).toBeUndefined()
  })
})
