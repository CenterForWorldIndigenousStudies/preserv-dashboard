// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  toolbarProps: undefined as Record<string, unknown> | undefined,
}))

vi.mock('material-react-table', () => ({
  MaterialReactTable: () => null,
  useMaterialReactTable: () => ({}),
}))

vi.mock('@molecules/DocumentTableToolbar', () => ({
  DocumentTableToolbar: (props: Record<string, unknown>) => {
    mocks.toolbarProps = props
    return null
  },
}))

vi.mock('@molecules/DocumentTableCursorPager', () => ({
  DocumentTableCursorPager: () => null,
}))

vi.mock('@organisms/DocumentTable/buildDocumentTableMrtOptions', () => ({
  buildDocumentTableMrtOptions: () => ({}),
}))

import { DocumentDataTable } from '@organisms/DocumentTable/DocumentDataTable'

interface TestRow {
  id: string
}

const initialQuery = { page: 1, pageSize: 25, filters: {} }

let root: Root | undefined

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = undefined
  mocks.toolbarProps = undefined
})

describe('DocumentDataTable', () => {
  it('updates the results count after fetching a filtered page', async () => {
    const container = document.createElement('div')
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <DocumentDataTable<TestRow, Record<string, never>>
          definition={{
            tableId: 'test-documents',
            columns: [],
            fetcher: vi.fn().mockResolvedValue({
              data: [{ id: 'document-1' }],
              totalCount: 7,
              pageInfo: {
                pageSize: 25,
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
              },
            }),
          }}
          initialQuery={initialQuery}
        />,
      )
      await Promise.resolve()
    })

    expect(mocks.toolbarProps?.totalCount).toBe(7)
  })
})
