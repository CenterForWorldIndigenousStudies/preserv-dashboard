import type { ReactNode } from 'react'
import type { CheckboxProps } from '@mui/material/Checkbox'
import type { RadioProps } from '@mui/material/Radio'
import type { TableRowProps } from '@mui/material/TableRow'
import type { MRT_ColumnDef, MRT_RowData, MRT_RowSelectionState, MRT_Updater } from 'material-react-table'

import type { AdvancedSearchFilters, FilterOptions } from '@lib/search'

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

export interface DocumentTableAdvancedSearchConfig {
  filters: AdvancedSearchFilters
  filterOptions: FilterOptions
  onApply: (filters: AdvancedSearchFilters) => void
}

export interface DocumentTableRowActionContext<TData> {
  row: TData
}

export interface DocumentTableRowActionConfig<TData> {
  id: string
  render: (context: DocumentTableRowActionContext<TData>) => ReactNode | undefined
}

export interface DocumentTableConfig<TData extends MRT_RowData & { id: string }, TFilters> {
  definition: Omit<DocumentTableDefinition<TData, TFilters>, 'renderRowActions'>
  rowActions?: readonly DocumentTableRowActionConfig<TData>[]
  rowActionsHeader?: string
  rowActionsColumnSize?: number
  emptyMessage?: string
  searchPlaceholder?: string
  styleVariant?: 'default' | 'reviewQueueDense'
  advancedSearch?: DocumentTableAdvancedSearchConfig
  leadingToolbarSlot?: ReactNode
  trailingToolbarSlot?: ReactNode
  rowSelection?: MRT_RowSelectionState
  onRowSelectionChange?: (updater: MRT_Updater<MRT_RowSelectionState>) => void
  enableRowSelection?: boolean
  enableSorting?: boolean
  getRowId?: (row: TData) => string
  getRowProps?: (row: TData) => TableRowProps
  getSelectCheckboxProps?: (row: TData) => CheckboxProps | RadioProps
  excludedRowIds?: readonly string[]
  showToolbar?: boolean
  showPager?: boolean
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
