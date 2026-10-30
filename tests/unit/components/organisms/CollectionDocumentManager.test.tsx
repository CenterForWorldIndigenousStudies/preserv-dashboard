import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ACCESS_LEVEL_OPTIONS } from '@constants/accessLevels'
import type { FilterOptions } from '@lib/search'

const mocks = vi.hoisted(() => ({
  selectionTitles: [] as string[],
  advancedSearchProps: undefined as Record<string, unknown> | undefined,
}))

vi.mock('@hooks/useCollectionManager', () => ({
  useCollectionManager: () => ({
    inCollection: [],
    outOfCollection: [],
    inTotal: 0,
    outTotal: 0,
    selectedIn: new Set<string>(),
    selectedOut: new Set<string>(),
    activeAction: 'add',
    isLoading: false,
    isSubmitting: false,
    error: null,
    inSearch: '',
    outSearch: '',
    outFilters: {},
    inSort: { field: 'name', direction: 'asc' },
    outSort: { field: 'name', direction: 'asc' },
    inPage: 1,
    outPage: 1,
    inPageSize: 25,
    outPageSize: 25,
    setInSearch: vi.fn(),
    setOutSearch: vi.fn(),
    setOutFilters: vi.fn(),
    setInSort: vi.fn(),
    setOutSort: vi.fn(),
    setInPage: vi.fn(),
    setOutPage: vi.fn(),
    toggleIn: vi.fn(),
    toggleOut: vi.fn(),
    handleConfirm: vi.fn(),
    pendingAction: null,
    setPendingAction: vi.fn(),
    showConfirm: false,
    setShowConfirm: vi.fn(),
  }),
}))

vi.mock('@molecules/SelectionTable', () => ({
  SelectionTable: (props: Record<string, unknown>) => {
    mocks.selectionTitles.push(String(props.title))
    return (
      <div>
        {props.title as string}
        {props.leadingToolbarSlot as React.ReactNode}
      </div>
    )
  },
}))

vi.mock('@organisms/AdvancedSearchModal', () => ({
  AdvancedSearchModal: (props: Record<string, unknown>) => {
    mocks.advancedSearchProps = props
    return <button type={'button'}>{'Advanced Search'}</button>
  },
}))

vi.mock('@organisms/Modal', () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@molecules/ConfirmationDialog', () => ({ ConfirmationDialog: () => null }))

import { CollectionDocumentManager } from '@organisms/CollectionDocumentManager'

const filterOptions: FilterOptions = {
  collections: ['Education'],
  accessLevels: [...ACCESS_LEVEL_OPTIONS],
  statuses: ['APPROVED', 'NEEDS_REVIEW'],
}

afterEach(() => {
  mocks.selectionTitles = []
  mocks.advancedSearchProps = undefined
})

describe('CollectionDocumentManager', () => {
  it('shows Advanced Search in the Available Documents table', () => {
    const markup = renderToStaticMarkup(
      <CollectionDocumentManager
        collectionId={'collection-1'}
        collectionName={'Education'}
        filterOptions={filterOptions}
        open
        onClose={vi.fn()}
      />,
    )

    expect(markup).toContain('Available Documents')
    expect(markup).toContain('Advanced Search')
    expect(mocks.selectionTitles).toEqual(['Available Documents'])
    expect(mocks.advancedSearchProps).toMatchObject({ filterOptions })
  })
})
