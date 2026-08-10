import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockGetLibraryDocuments, mockGetDocumentFilterOptions, mockLibraryTable, mocks } = vi.hoisted(() => ({
  mockGetLibraryDocuments: vi.fn(),
  mockGetDocumentFilterOptions: vi.fn(),
  mockLibraryTable: vi.fn(() => null),
  mocks: { libraryTableProps: undefined as Record<string, unknown> | undefined },
}))

vi.mock('@lib/queries/queries', () => ({
  getLibraryDocuments: mockGetLibraryDocuments,
  getDocumentFilterOptions: mockGetDocumentFilterOptions,
}))

vi.mock('@organisms/LibraryTable', () => ({
  LibraryTable: (props: Record<string, unknown>) => {
    mocks.libraryTableProps = props
    return mockLibraryTable()
  },
}))

import LibraryPage, { PAGE_DESCRIPTION } from '@root/app/library/page'
import { PAGE_LABELS } from '@constants/pageLabels'

describe('LibraryPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
    mocks.libraryTableProps = undefined
  })

  it('loads the parsed query and renders the completed-library framing', async () => {
    mockGetLibraryDocuments.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    })
    mockGetDocumentFilterOptions.mockResolvedValue({ collections: [], accessLevels: [], statuses: [] })

    const markup = renderToStaticMarkup(
      await LibraryPage({
        searchParams: Promise.resolve({ collection: 'Collection A', page: '2' }),
      }),
    )

    expect(markup).toContain(PAGE_LABELS.library)
    expect(markup).toContain(PAGE_DESCRIPTION)
    expect(mockGetLibraryDocuments).toHaveBeenCalledWith({
      page: 2,
      pageSize: 25,
      search: undefined,
      orderBy: undefined,
      sortDirection: undefined,
      cursorValue: undefined,
      cursorId: undefined,
      cursorDirection: undefined,
      collection: 'Collection A',
    })
    expect(mocks.libraryTableProps).toMatchObject({
      initialQuery: {
        page: 2,
        filters: { collection: 'Collection A' },
      },
    })
  })
})
