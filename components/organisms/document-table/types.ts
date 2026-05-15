import type { ReactNode } from 'react'
import type { MRT_ColumnDef, MRT_RowData, MRT_RowSelectionState } from 'material-react-table'

export interface DocumentTableCursor {
  id: string
  value: string
}

export interface DocumentTablePageInfo {
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: DocumentTableCursor | null
  endCursor: DocumentTableCursor | null
}

export interface DocumentTableFetchResult<TData> {
  data: TData[]
  totalCount?: number
  pageInfo: DocumentTablePageInfo
}

export interface DocumentTableQuery<TFilters> {
  page: number
  pageSize: number
  search?: string
  orderBy?: string
  sortDirection?: 'asc' | 'desc'
  cursorValue?: string
  cursorId?: string
  cursorDirection?: 'next' | 'prev'
  filters: TFilters
}

export type DocumentTableFetcher<TData, TFilters> = (
  query: DocumentTableQuery<TFilters>,
) => Promise<DocumentTableFetchResult<TData>>

export interface DocumentTableSelectionState {
  selectedRowIds: MRT_RowSelectionState
}

export interface DocumentTableRowAction<TData> {
  id: string
  label: string
  onClick: (row: TData) => void | Promise<void>
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: (row: TData) => boolean
}

export interface DocumentTableDefinition<TData extends MRT_RowData, TFilters> {
  tableId: string
  columns: MRT_ColumnDef<TData>[]
  fetcher: DocumentTableFetcher<TData, TFilters>
  renderRowActions?: (row: TData) => ReactNode
  rowActionsHeader?: string
  rowActionsColumnSize?: number
}

export interface DocumentTableController<TFilters> {
  currentQueryKey: string
  filters: TFilters
  page: number
  pageSize: number
  query: DocumentTableQuery<TFilters>
  search: string
  sorting: Array<{ id: string; desc: boolean }>
  setFilters: (filters: TFilters) => void
  setPageSize: (pageSize: number) => void
  setSearch: (search: string) => void
  setSorting: (
    sorting:
      | Array<{ id: string; desc: boolean }>
      | ((prev: Array<{ id: string; desc: boolean }>) => Array<{ id: string; desc: boolean }>),
  ) => void
  goToNextPage: (cursor?: DocumentTableCursor | null) => void
  goToPreviousPage: (cursor?: DocumentTableCursor | null) => void
}
