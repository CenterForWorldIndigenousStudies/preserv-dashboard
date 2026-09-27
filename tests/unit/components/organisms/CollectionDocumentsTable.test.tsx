import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ACCESS_LEVEL_OPTIONS } from '@constants/accessLevels'
import { DOCUMENTS_PATH, getCollectionDetailPath } from '@constants/paths'
import type { FilterOptions } from '@lib/search'

const mocks = vi.hoisted(() => ({
  documentTableProps: undefined as Record<string, unknown> | undefined,
}))

vi.mock('@actions/collections', () => ({
  getDocumentsForCollectionAction: vi.fn(),
}))

vi.mock('@organisms/DocumentTable/DocumentTable', () => ({
  DocumentTable: ({
    config,
  }: {
    config: { definition: { columns: Array<{ Cell?: (args: unknown) => unknown }> } }
  }) => {
    mocks.documentTableProps = { config }
    const cell = config.definition.columns[0]?.Cell

    if (!cell) {
      return <div>No cell</div>
    }

    const renderedCell = cell({
      row: {
        original: {
          id: 'doc-1',
          id_legacy: 'legacy-1',
          name: 'Sample document',
          source_id: 'source-1',
        },
      },
    }) as ReactNode

    return <div data-testid="collection-document-link">{renderedCell}</div>
  },
}))

import { CollectionDocumentsTable } from '@organisms/CollectionDocumentsTable'

const filterOptions: FilterOptions = {
  collections: ['Collection One'],
  accessLevels: [...ACCESS_LEVEL_OPTIONS],
  statuses: ['APPROVED', 'NEEDS_REVIEW'],
}

describe('CollectionDocumentsTable', () => {
  it('configures the shared table shell and preserves collection detail links', () => {
    const actionSlot = <button type={'button'}>{'Actions (1)'}</button>
    const markup = renderToStaticMarkup(
      <CollectionDocumentsTable
        collectionId="collection-1"
        documentCount={1}
        initialQuery={{ page: 1, pageSize: 25, filters: {} }}
        filterOptions={filterOptions}
        collectionName="Collection One"
        originHref={getCollectionDetailPath('collection-1')}
        onQueryChange={vi.fn()}
        trailingToolbarSlot={actionSlot}
      />,
    )

    expect(markup).toContain(
      `${DOCUMENTS_PATH}/doc-1?from=%2Fcollections%2Fcollection-1&amp;fromLabel=Collection+One`,
    )
    expect(mocks.documentTableProps?.config).toMatchObject({
      definition: { tableId: 'collection-documents-collection-1' },
      emptyMessage: 'No documents associated with this collection.',
      advancedSearch: {
        filterOptions,
        showActiveFilterCount: false,
      },
      trailingToolbarSlot: actionSlot,
    })
  })
})
