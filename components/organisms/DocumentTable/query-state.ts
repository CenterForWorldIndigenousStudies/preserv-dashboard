import type { MRT_SortingState } from 'material-react-table'

import type { DocumentTableCursor, DocumentTableQuery } from './types'

export const DOCUMENT_TABLE_PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500] as const

export function buildInitialDocumentTableSorting<TFilters>(
  initialQuery: DocumentTableQuery<TFilters>,
): MRT_SortingState {
  if (!initialQuery.orderBy) {
    return []
  }

  return [
    {
      id: initialQuery.orderBy,
      desc: initialQuery.sortDirection === 'desc',
    },
  ]
}

export function documentTableQueriesEqual<TFilters>(
  left: DocumentTableQuery<TFilters>,
  right: DocumentTableQuery<TFilters>,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function applyDocumentTableSearch<TFilters>(
  query: DocumentTableQuery<TFilters>,
  search: string,
): DocumentTableQuery<TFilters> {
  return {
    ...query,
    page: 1,
    search: search.trim() || undefined,
    cursorValue: undefined,
    cursorId: undefined,
    cursorDirection: undefined,
  }
}

export function applyDocumentTablePageSize<TFilters>(
  query: DocumentTableQuery<TFilters>,
  pageSize: number,
): DocumentTableQuery<TFilters> {
  return {
    ...query,
    page: 1,
    pageSize,
    cursorValue: undefined,
    cursorId: undefined,
    cursorDirection: undefined,
  }
}

export function applyDocumentTableFilters<TFilters>(
  query: DocumentTableQuery<TFilters>,
  filters: TFilters,
): DocumentTableQuery<TFilters> {
  return {
    ...query,
    page: 1,
    filters,
    cursorValue: undefined,
    cursorId: undefined,
    cursorDirection: undefined,
  }
}

export function applyDocumentTableSorting<TFilters>(
  query: DocumentTableQuery<TFilters>,
  sorting: MRT_SortingState,
): DocumentTableQuery<TFilters> {
  const primarySort = sorting[0]

  return {
    ...query,
    page: 1,
    orderBy: primarySort?.id,
    sortDirection: primarySort ? (primarySort.desc ? 'desc' : 'asc') : undefined,
    cursorValue: undefined,
    cursorId: undefined,
    cursorDirection: undefined,
  }
}

export function applyNextDocumentTableCursor<TFilters>(
  query: DocumentTableQuery<TFilters>,
  cursor?: DocumentTableCursor | null,
): DocumentTableQuery<TFilters> {
  if (!cursor) {
    return {
      ...query,
      page: query.page + 1,
      cursorValue: undefined,
      cursorId: undefined,
      cursorDirection: undefined,
    }
  }

  return {
    ...query,
    page: query.page + 1,
    cursorValue: cursor.value,
    cursorId: cursor.id,
    cursorDirection: 'next',
  }
}

export function applyPreviousDocumentTableCursor<TFilters>(
  query: DocumentTableQuery<TFilters>,
  cursor?: DocumentTableCursor | null,
): DocumentTableQuery<TFilters> {
  if (!cursor) {
    return {
      ...query,
      page: Math.max(1, query.page - 1),
      cursorValue: undefined,
      cursorId: undefined,
      cursorDirection: undefined,
    }
  }

  return {
    ...query,
    page: Math.max(1, query.page - 1),
    cursorValue: cursor.value,
    cursorId: cursor.id,
    cursorDirection: 'prev',
  }
}
