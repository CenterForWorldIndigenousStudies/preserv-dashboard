// @vitest-environment jsdom

import { act, memo } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ACCESS_LEVEL_OPTIONS } from '@constants/accessLevels'
import { getCollectionDetailPath } from '@constants/paths'
import type { FilterOptions } from '@lib/search'
import type { CollectionWithMeta } from 'types/collections'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { mockReplace, mockSearchParams } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockSearchParams: new URLSearchParams(
    'expanded=collection-1&collection-collection-1-page=2&collection-collection-1-pageSize=50&collection-collection-1-search=thesis',
  ),
}))

const mocks = vi.hoisted(() => ({
  collectionActionButtonProps: undefined as Record<string, unknown> | undefined,
  collectionDocumentsTableProps: undefined as Record<string, unknown> | undefined,
  collectionDocumentsTableRenderCount: 0,
}))

let mountedRoot: Root | undefined

const collection: CollectionWithMeta = {
  id: 'collection-1',
  tag_id: 'tag-1',
  collection_name: 'Collection One',
  created_at: null,
  updated_at: null,
  document_count: 1,
  notes: null,
}

const filterOptions: FilterOptions = {
  collections: ['Collection One'],
  accessLevels: [...ACCESS_LEVEL_OPTIONS],
  statuses: ['APPROVED', 'NEEDS_REVIEW'],
}

vi.mock('next/navigation', () => ({
  usePathname: () => getCollectionDetailPath('collection-1'),
  useRouter: () => ({ replace: mockReplace, refresh: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@actions/collections', () => ({
  deleteCollectionAction: vi.fn(),
  getCollectionDeletionPreviewAction: vi.fn(),
}))

vi.mock('@organisms/CollectionDocumentsTable', () => ({
  CollectionDocumentsTable: memo((props: Record<string, unknown>) => {
    mocks.collectionDocumentsTableRenderCount += 1
    mocks.collectionDocumentsTableProps = props
    return (
      <div data-testid="collection-documents-table">
        {props.trailingToolbarSlot as React.ReactNode}
        {'Collection documents table'}
      </div>
    )
  }),
}))

vi.mock('@molecules/CollectionActionButton', () => ({
  CollectionActionButton: (props: Record<string, unknown>) => {
    mocks.collectionActionButtonProps = props
    return <button type={'button'}>{`Actions (${String(props.selectedCount)})`}</button>
  },
}))

vi.mock('@organisms/CollectionDocumentManager', () => ({
  CollectionDocumentManager: () => null,
}))

vi.mock('@organisms/CollectionEditDialog', () => ({
  CollectionEditDialog: () => null,
}))

vi.mock('@organisms/CollectionRenameDialog', () => ({
  CollectionRenameDialog: () => null,
}))

vi.mock('@organisms/CollectionDeleteDialog', () => ({
  CollectionDeleteDialog: () => null,
}))

import { CollectionDetails } from '@organisms/CollectionDetails'

afterEach(() => {
  act(() => {
    mountedRoot?.unmount()
  })
  mountedRoot = undefined
  mocks.collectionActionButtonProps = undefined
  mocks.collectionDocumentsTableProps = undefined
  mocks.collectionDocumentsTableRenderCount = 0
})

describe('CollectionDetails', () => {
  it('renders the collection details and document table without accordion controls', () => {
    const markup = renderToStaticMarkup(<CollectionDetails collection={collection} filterOptions={filterOptions} />)

    expect(markup).not.toContain('Collection One')
    expect(markup).toContain('Collection documents table')
    expect(markup).not.toContain('MuiAccordion-root')
    expect(markup).not.toContain('1 document')
    expect(mocks.collectionDocumentsTableProps).toMatchObject({
      collectionId: 'collection-1',
      documentCount: 1,
      originHref:
        '/collections/collection-1?collection-collection-1-page=2&collection-collection-1-pageSize=50&collection-collection-1-search=thesis&collection-collection-1-collection=Collection+One',
    })
  })

  it('uses the collection Actions menu without row selection', () => {
    const markup = renderToStaticMarkup(<CollectionDetails collection={collection} filterOptions={filterOptions} />)

    expect(markup).toContain('Actions (1)')
    expect(mocks.collectionActionButtonProps).toMatchObject({
      selectedCount: 1,
      hasDocuments: true,
      disabled: false,
    })
  })

  it('does not rerender the document table when an action modal opens', () => {
    const container = document.createElement('div')
    mountedRoot = createRoot(container)

    act(() => {
      mountedRoot?.render(<CollectionDetails collection={collection} filterOptions={filterOptions} />)
    })
    const initialRenderCount = mocks.collectionDocumentsTableRenderCount

    act(() => {
      ;(mocks.collectionActionButtonProps?.onEdit as () => void)()
    })

    expect(mocks.collectionDocumentsTableRenderCount).toBe(initialRenderCount)
  })

  it('keeps the document query callback stable across parent renders', () => {
    const container = document.createElement('div')
    mountedRoot = createRoot(container)

    act(() => {
      mountedRoot?.render(<CollectionDetails collection={collection} filterOptions={filterOptions} />)
    })
    const firstCallback = mocks.collectionDocumentsTableProps?.onQueryChange

    act(() => {
      mountedRoot?.render(
        <CollectionDetails collection={{ ...collection, notes: 'Updated notes' }} filterOptions={filterOptions} />,
      )
    })

    expect(mocks.collectionDocumentsTableProps?.onQueryChange).toBe(firstCallback)
  })
})
