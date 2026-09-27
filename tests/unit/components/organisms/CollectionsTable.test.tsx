// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CollectionListPageResult, CollectionTableQuery, CollectionWithMeta } from 'types/collections'
import type { FilterOptions } from '@lib/search'

const mocks = vi.hoisted(() => ({
  actionButtonProps: undefined as Record<string, unknown> | undefined,
  documentTableProps: undefined as Record<string, unknown> | undefined,
  entityNameProps: undefined as Record<string, unknown> | undefined,
  getCollectionsAction: vi.fn(),
  router: { refresh: vi.fn(), replace: vi.fn() },
}))

const searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  usePathname: () => '/collections',
  useRouter: () => mocks.router,
  useSearchParams: () => searchParams,
}))

vi.mock('@actions/collections', () => ({
  getCollectionsAction: mocks.getCollectionsAction,
}))

vi.mock('@organisms/DocumentTable/DocumentTable', () => ({
  DocumentTable: (props: Record<string, unknown>) => {
    mocks.documentTableProps = props
    return <div data-testid="document-table">Document table</div>
  },
}))

vi.mock('@molecules/CollectionActionButton', () => ({
  CollectionActionButton: (props: Record<string, unknown>) => {
    mocks.actionButtonProps = props
    return <button type="button">{`Actions (${String(props.selectedCount)})`}</button>
  },
}))

vi.mock('@molecules/EntityNameBlock', () => ({
  EntityNameBlock: (props: Record<string, unknown>) => {
    mocks.entityNameProps = props
    return <span>{String(props.name)}</span>
  },
}))

vi.mock('@organisms/AddCollectionDialog', () => ({ AddCollectionDialog: () => null }))
vi.mock('@organisms/CollectionDocumentManager', () => ({ CollectionDocumentManager: () => null }))
vi.mock('@organisms/CollectionEditDialog', () => ({ CollectionEditDialog: () => null }))
vi.mock('@organisms/CollectionRenameDialog', () => ({ CollectionRenameDialog: () => null }))
vi.mock('@organisms/CollectionDeleteDialog', () => ({ CollectionDeleteDialog: () => null }))

import { CollectionsTable } from '@organisms/CollectionsTable'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined

const collectionOne: CollectionWithMeta = {
  id: 'collection-1',
  tag_id: 'tag-1',
  collection_name: 'Collection One',
  canonical_tag: { id: 'tag-1', name: 'Collection One' },
  qualifiers: [],
  fedora_node_id: '50',
  notes: null,
  created_at: null,
  updated_at: null,
  document_count: 3,
}

const collectionTwo: CollectionWithMeta = {
  ...collectionOne,
  id: 'collection-2',
  tag_id: 'tag-2',
  collection_name: 'Collection Two',
  canonical_tag: { id: 'tag-2', name: 'Collection Two' },
  fedora_node_id: null,
  document_count: 0,
}

const initialQuery: CollectionTableQuery = { page: 1, pageSize: 25, filters: {} }
const filterOptions: FilterOptions = {
  collections: ['Collection One'],
  accessLevels: ['public'],
  statuses: ['VALIDATED'],
}

function pageData(data: CollectionWithMeta[]): CollectionListPageResult {
  return {
    data,
    totalCount: data.length,
    pageInfo: {
      pageSize: 25,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  }
}

function renderTable(data: CollectionWithMeta[] = [collectionOne, collectionTwo]): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)

  act(() => {
    root?.render(<CollectionsTable initialData={pageData(data)} initialQuery={initialQuery} filterOptions={filterOptions} />)
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  document.body.replaceChildren()
  mocks.actionButtonProps = undefined
  mocks.documentTableProps = undefined
  mocks.entityNameProps = undefined
  vi.clearAllMocks()
})

describe('CollectionsTable', () => {
  it('synchronizes query changes with browser history without starting a server navigation', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState')

    renderTable()

    expect(replaceState).toHaveBeenCalled()
    expect(mocks.router.replace).not.toHaveBeenCalled()

    replaceState.mockRestore()
  })

  it('configures collection columns and the collection fetcher', async () => {
    const fetchResult = pageData([collectionOne])
    mocks.getCollectionsAction.mockResolvedValue(fetchResult)
    renderTable()

    const config = mocks.documentTableProps?.config as {
      definition: {
        tableId: string
        columns: Array<{
          accessorKey?: string
          header?: string
          Cell?: (props: { row: { original: CollectionWithMeta } }) => React.ReactNode
        }>
        fetcher: (query: CollectionTableQuery) => Promise<CollectionListPageResult>
      }
      enableRowSelection?: boolean
      enableMultiRowSelection?: boolean
      advancedSearch?: { filters: unknown; filterOptions: FilterOptions }
    }

    expect(config.definition.tableId).toBe('collections')
    expect(config.enableRowSelection).toBe(true)
    expect(config.enableMultiRowSelection).toBe(false)
    expect(config.advancedSearch).toMatchObject({ filters: {}, filterOptions, showActiveFilterCount: false })

    const nameColumn = config.definition.columns.find(({ accessorKey }) => accessorKey === 'collection_name')
    expect(nameColumn?.header).toBe('Name')
    renderToStaticMarkup(nameColumn?.Cell?.({ row: { original: collectionOne } }) ?? null)
    expect(mocks.entityNameProps).toMatchObject({
      name: 'Collection One',
      id: 'collection-1',
      additionalId: '50',
      additionalIdLabel: 'Library ID',
      href: '/collections/collection-1',
    })

    const countColumn = config.definition.columns.find(({ accessorKey }) => accessorKey === 'document_count')
    expect(renderToStaticMarkup(countColumn?.Cell?.({ row: { original: collectionOne } }) ?? null)).toContain('3')

    await expect(config.definition.fetcher(initialQuery)).resolves.toBe(fetchResult)
    expect(mocks.getCollectionsAction).toHaveBeenCalledWith(initialQuery)
  })

  it('normalizes row selection to one collection and clears stale selection', () => {
    renderTable()
    const config = mocks.documentTableProps?.config as {
      rowSelection?: Record<string, boolean>
      onRowSelectionChange?: (updater: Record<string, boolean>) => void
    }

    act(() => {
      config.onRowSelectionChange?.({ 'collection-1': true, 'collection-2': true })
    })

    const selectedConfig = mocks.documentTableProps?.config as {
      rowSelection?: Record<string, boolean>
      trailingToolbarSlot?: React.ReactNode
    }
    expect(selectedConfig.rowSelection).toEqual({ 'collection-2': true })
    renderToStaticMarkup(<>{selectedConfig.trailingToolbarSlot}</>)
    expect(mocks.actionButtonProps).toMatchObject({ selectedCount: 1, hasDocuments: false, disabled: false })
    const toolbarMarkup = renderToStaticMarkup(<>{selectedConfig.trailingToolbarSlot}</>)
    expect(toolbarMarkup).toContain('Add Collection')
    expect(toolbarMarkup.indexOf('Actions')).toBeLessThan(toolbarMarkup.indexOf('Add Collection'))

    act(() => {
      root?.render(
        <CollectionsTable initialData={pageData([collectionOne])} initialQuery={initialQuery} filterOptions={filterOptions} />,
      )
    })

    const staleSelectionConfig = mocks.documentTableProps?.config as { trailingToolbarSlot?: React.ReactNode }
    renderToStaticMarkup(<>{staleSelectionConfig.trailingToolbarSlot}</>)
    expect(mocks.actionButtonProps).toMatchObject({ selectedCount: 0, disabled: true })
  })
})
