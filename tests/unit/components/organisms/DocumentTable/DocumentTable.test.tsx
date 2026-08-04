import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { AdvancedSearchFilters, FilterOptions } from '@lib/search'
import type { DocumentTableConfig } from '@organisms/DocumentTable/types'

interface TestRow {
  id: string
  name: string
}

const mocks = vi.hoisted(() => ({
  dataTableProps: undefined as Record<string, unknown> | undefined,
  advancedSearchProps: undefined as Record<string, unknown> | undefined,
}))

vi.mock('@organisms/DocumentTable/DocumentDataTable', () => ({
  DocumentDataTable: (props: Record<string, unknown>) => {
    mocks.dataTableProps = props
    return <div data-testid="document-data-table">Data table</div>
  },
}))

vi.mock('@components/organisms/AdvancedSearchModal', () => ({
  AdvancedSearchModal: (props: Record<string, unknown>) => {
    mocks.advancedSearchProps = props
    return <div data-testid="advanced-search">Advanced Search</div>
  },
}))

import { DocumentTable } from '@organisms/DocumentTable/DocumentTable'

const initialQuery = {
  page: 1,
  pageSize: 25,
  filters: {} as AdvancedSearchFilters,
}

const filterOptions: FilterOptions = {
  collections: [],
  accessLevels: [],
  statuses: [],
}

function buildConfig(overrides: Partial<DocumentTableConfig<TestRow, AdvancedSearchFilters>> = {}) {
  return {
    definition: {
      tableId: 'test-documents',
      columns: [],
      fetcher: vi.fn(() =>
        Promise.resolve({
          data: [],
          pageInfo: {
            pageSize: 25,
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        }),
      ),
    },
    ...overrides,
  } satisfies DocumentTableConfig<TestRow, AdvancedSearchFilters>
}

describe('DocumentTable', () => {
  it('forwards configured rendering options to the low-level table', () => {
    const config = buildConfig({
      emptyMessage: 'Nothing here',
      searchPlaceholder: 'Search this view',
      styleVariant: 'reviewQueueDense',
      leadingToolbarSlot: <span>Leading</span>,
      trailingToolbarSlot: <span>Trailing</span>,
      enableRowSelection: true,
    })

    renderToStaticMarkup(<DocumentTable config={config} initialQuery={initialQuery} />)

    expect(mocks.dataTableProps).toMatchObject({
      definition: config.definition,
      emptyMessage: 'Nothing here',
      searchPlaceholder: 'Search this view',
      styleVariant: 'reviewQueueDense',
      leadingToolbarSlot: config.leadingToolbarSlot,
      trailingToolbarSlot: config.trailingToolbarSlot,
      enableRowSelection: true,
    })
  })

  it('renders Advanced Search from the page configuration', () => {
    const filters: AdvancedSearchFilters = { author: 'Author' }
    const onApply = vi.fn()
    const config = buildConfig({
      advancedSearch: {
        filters,
        filterOptions,
        onApply,
      },
    })

    renderToStaticMarkup(<DocumentTable config={config} initialQuery={initialQuery} />)

    const leadingToolbarSlot = mocks.dataTableProps?.leadingToolbarSlot as ReactNode
    expect(renderToStaticMarkup(<>{leadingToolbarSlot}</>)).toContain('Advanced Search')
    expect(mocks.advancedSearchProps).toMatchObject({ filters, filterOptions, onApply })
  })

  it('resolves configured row actions through stable action IDs', () => {
    const config = buildConfig({
      rowActions: [
        {
          id: 'open',
          render: ({ row }) => <span>{`Open ${row.name}`}</span>,
        },
      ],
    })

    renderToStaticMarkup(<DocumentTable config={config} initialQuery={initialQuery} />)

    const definition = mocks.dataTableProps?.definition as {
      renderRowActions?: (row: TestRow) => ReactNode
    }
    const actionMarkup = renderToStaticMarkup(<>{definition.renderRowActions?.({ id: 'doc-1', name: 'Sample' })}</>)

    expect(actionMarkup).toContain('Open Sample')
  })

  it('does not render Advanced Search when it is not configured', () => {
    const markup = renderToStaticMarkup(<DocumentTable config={buildConfig()} initialQuery={initialQuery} />)

    expect(markup).not.toContain('Advanced Search')
  })
})
