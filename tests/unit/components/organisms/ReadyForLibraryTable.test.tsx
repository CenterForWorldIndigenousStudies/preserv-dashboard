import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DOCUMENTS_PATH, READY_FOR_LIBRARY_PATH } from '@constants/paths'
import type { FilterOptions } from '@lib/search'

const { mockReplace, mockSearchParams } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockSearchParams: new URLSearchParams('page=2&pageSize=50&search=Sample&orderBy=name&sortDirection=desc'),
}))

const mocks = vi.hoisted(() => ({
  documentTableProps: undefined as Record<string, unknown> | undefined,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => READY_FOR_LIBRARY_PATH,
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@actions/ready-for-library', () => ({
  getReadyForLibraryAction: vi.fn(),
}))

vi.mock('@organisms/DocumentTable/DocumentTable', () => ({
  DocumentTable: ({
    config,
  }: {
    config: { definition: { columns: Array<{ Cell?: (args: unknown) => unknown }> } }
  }) => {
    mocks.documentTableProps = { config }
    const { definition } = config
    const cell = definition.columns[0]?.Cell

    if (!cell) {
      return <div>No cell</div>
    }

    const renderedCell = cell({
      row: {
        original: {
          id: 'doc-1',
          name: 'Sample document',
        },
      },
    }) as ReactNode

    return <div data-testid="ready-for-library-link">{renderedCell}</div>
  },
}))

import { ReadyForLibraryTable } from '@organisms/ReadyForLibraryTable'

const filterOptions: FilterOptions = {
  collections: [],
  accessLevels: [],
  statuses: [],
}

describe('ReadyForLibraryTable', () => {
  it('links document detail back to the current ready-for-library state', () => {
    const markup = renderToStaticMarkup(
      <ReadyForLibraryTable
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
        initialQuery={{
          page: 2,
          pageSize: 50,
          search: 'Sample',
          orderBy: 'name',
          sortDirection: 'desc',
          filters: {},
        }}
        filterOptions={filterOptions}
      />,
    )

    expect(markup).toContain(
      `${DOCUMENTS_PATH}/doc-1?from=%2Fready-for-library%3Fpage%3D2%26pageSize%3D50%26search%3DSample%26orderBy%3Dname%26sortDirection%3Ddesc`,
    )
    expect(mocks.documentTableProps?.config).toBeDefined()
  })
})
