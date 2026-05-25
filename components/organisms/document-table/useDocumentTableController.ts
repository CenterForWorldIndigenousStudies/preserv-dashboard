'use client'

import { useMemo, useState } from 'react'
import type { MRT_SortingState } from 'material-react-table'

import {
  applyDocumentTableFilters,
  applyDocumentTablePageSize,
  applyDocumentTableSearch,
  applyDocumentTableSorting,
  applyNextDocumentTableCursor,
  applyPreviousDocumentTableCursor,
  buildInitialDocumentTableSorting,
} from './query-state'
import type { DocumentTableCursor, DocumentTableQuery } from './types'

export function useDocumentTableController<TFilters>(options: { initialQuery: DocumentTableQuery<TFilters> }) {
  const [query, setQuery] = useState<DocumentTableQuery<TFilters>>(options.initialQuery)
  const [sorting, setSortingState] = useState<MRT_SortingState>(buildInitialDocumentTableSorting(options.initialQuery))

  const search = query.search ?? ''
  const page = query.page
  const pageSize = query.pageSize
  const filters = query.filters

  return {
    filters,
    page,
    pageSize,
    query,
    search,
    sorting,
    setFilters: (nextFilters: TFilters) => {
      setQuery((currentQuery) => applyDocumentTableFilters(currentQuery, nextFilters))
    },
    setPageSize: (nextPageSize: number) => {
      setQuery((currentQuery) => applyDocumentTablePageSize(currentQuery, nextPageSize))
    },
    setSearch: (nextSearch: string) => {
      setQuery((currentQuery) => applyDocumentTableSearch(currentQuery, nextSearch))
    },
    setSorting: (nextSorting: MRT_SortingState | ((prev: MRT_SortingState) => MRT_SortingState)) => {
      setSortingState((currentSorting) => {
        const resolvedSorting = typeof nextSorting === 'function' ? nextSorting(currentSorting) : nextSorting
        setQuery((currentQuery) => applyDocumentTableSorting(currentQuery, resolvedSorting))
        return resolvedSorting
      })
    },
    goToNextPage: (cursor?: DocumentTableCursor | null) => {
      setQuery((currentQuery) => applyNextDocumentTableCursor(currentQuery, cursor))
    },
    goToPreviousPage: (cursor?: DocumentTableCursor | null) => {
      setQuery((currentQuery) => applyPreviousDocumentTableCursor(currentQuery, cursor))
    },
    currentQueryKey: useMemo(() => JSON.stringify(query), [query]),
  }
}
