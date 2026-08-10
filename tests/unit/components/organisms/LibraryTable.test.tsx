import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { COLLECTIONS_PATH, DOCUMENTS_PATH, LIBRARY_PATH } from '@constants/paths'
import type { FilterOptions } from '@lib/search'

const { mockGetLibraryDocumentsAction, mocks } = vi.hoisted(() => ({
  mockGetLibraryDocumentsAction: vi.fn(),
  mocks: { documentTableProps: undefined as Record<string, unknown> | undefined },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => LIBRARY_PATH,
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('page=2&pageSize=50'),
}))

vi.mock('@actions/library', () => ({
  getLibraryDocumentsAction: mockGetLibraryDocumentsAction,
}))

vi.mock('@organisms/DocumentTable/DocumentTable', () => ({
  DocumentTable: ({ config }: { config: Record<string, unknown> }) => {
    mocks.documentTableProps = { config }
    return null
  },
}))

import { LibraryTable } from '@organisms/LibraryTable'

const filterOptions: FilterOptions = {
  collections: ['Collection One'],
  accessLevels: ['public', 'restricted', 'internal', 'admin', 'confidential'],
  statuses: ['APPROVED'],
}

describe('LibraryTable', () => {
  it('configures the shared shell with full Advanced Search and Library columns', async () => {
    mockGetLibraryDocumentsAction.mockResolvedValue({
      items: [
        {
          id: 'doc-1',
          legacyId: 'legacy-1',
          sourceId: 'source-1',
          name: 'Uploaded document',
          fedoraUrl: 'https://fedora.example/doc-1',
          uploadedAt: '2026-07-01T12:00:00.000Z',
          collections: [{ id: 'collection-1', name: 'Collection One' }],
          batch: { id: 'batch-1', name: 'Batch One', createdAt: '2026-07-01T00:00:00.000Z' },
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    })

    renderToStaticMarkup(
      <LibraryTable
        filterOptions={filterOptions}
        initialQuery={{ page: 2, pageSize: 50, filters: {} }}
        initialData={{
          data: [],
          totalCount: 0,
          pageInfo: {
            pageSize: 50,
            hasNextPage: false,
            hasPreviousPage: true,
            startCursor: null,
            endCursor: null,
          },
        }}
      />,
    )

    const config = mocks.documentTableProps?.config as {
      definition: {
        columns: Array<{ header?: string; Cell?: (args: unknown) => ReactNode }>
        fetcher: (query: unknown) => Promise<unknown>
      }
      advancedSearch?: { filterOptions: FilterOptions }
      emptyMessage?: string
    }

    expect(config).toMatchObject({
      definition: { tableId: 'library-documents' },
      emptyMessage: 'No documents have been uploaded to the library.',
      advancedSearch: { filterOptions },
    })
    expect(config.definition.columns.map((column) => column.header)).toEqual([
      'Document',
      'Fedora URL',
      'Uploaded',
      'Collection(s)',
      'Batch',
    ])

    const row = {
      id: 'doc-1',
      legacyId: 'legacy-1',
      sourceId: 'source-1',
      name: 'Uploaded document',
      fedoraUrl: 'https://fedora.example/doc-1',
      uploadedAt: '2026-07-01T12:00:00.000Z',
      collections: [{ id: 'collection-1', name: 'Collection One' }],
      batch: { id: 'batch-1', name: 'Batch One', createdAt: '2026-07-01T00:00:00.000Z' },
    }
    const renderCell = (index: number) =>
      renderToStaticMarkup(config.definition.columns[index].Cell?.({ row: { original: row } }) ?? null)

    expect(renderCell(0)).toContain(`${DOCUMENTS_PATH}/doc-1?from=%2Flibrary%3Fpage%3D2%26pageSize%3D50`)
    expect(renderCell(0)).toContain('legacy-1')
    expect(renderCell(0)).toContain('source-1')
    expect(renderCell(1)).toContain('https://fedora.example/doc-1')
    expect(renderCell(3)).toContain(`${COLLECTIONS_PATH}?expanded=collection-1`)
    expect(renderCell(4)).toContain('/batches/batch-1?from=%2Flibrary%3Fpage%3D2%26pageSize%3D50&amp;fromLabel=Library')

    const result = (await config.definition.fetcher({ page: 1, pageSize: 25, filters: {} })) as {
      data: unknown[]
      totalCount: number
    }
    expect(result.totalCount).toBe(1)
    expect(Array.isArray(result.data)).toBe(true)

    await config.definition.fetcher({
      page: 1,
      pageSize: 25,
      filters: { batch: 'Special_RCR_Writings_sept_25_2025' },
    })
    expect(mockGetLibraryDocumentsAction).toHaveBeenLastCalledWith({
      batch: 'Special_RCR_Writings_sept_25_2025',
      page: 1,
      pageSize: 25,
      search: undefined,
      orderBy: undefined,
      sortDirection: undefined,
      cursorValue: undefined,
      cursorId: undefined,
      cursorDirection: undefined,
    })
  })
})
