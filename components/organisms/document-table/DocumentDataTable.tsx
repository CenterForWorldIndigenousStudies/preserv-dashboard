'use client'

import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_RowData,
  type MRT_RowSelectionState,
  type MRT_Updater,
} from 'material-react-table'

import { DocumentTableCursorPager } from '@molecules/DocumentTableCursorPager'
import { DocumentTableToolbar } from '@molecules/DocumentTableToolbar'

import { buildDocumentTableMrtOptions } from './buildDocumentTableMrtOptions'
import { DOCUMENT_TABLE_PAGE_SIZE_OPTIONS, documentTableQueriesEqual } from './query-state'
import { useDocumentTableController } from './useDocumentTableController'
import type {
  DocumentTableController,
  DocumentTableDefinition,
  DocumentTableFetchResult,
  DocumentTableQuery,
} from './types'

interface DocumentDataTableProps<TData extends MRT_RowData & { id: string }, TFilters> {
  definition: DocumentTableDefinition<TData, TFilters>
  controller?: DocumentTableController<TFilters>
  initialQuery: DocumentTableQuery<TFilters>
  initialData?: DocumentTableFetchResult<TData>
  emptyMessage?: string
  searchPlaceholder?: string
  leadingToolbarSlot?: ReactNode
  trailingToolbarSlot?: ReactNode
  rowSelection?: MRT_RowSelectionState
  onRowSelectionChange?: (updater: MRT_Updater<MRT_RowSelectionState>) => void
  enableRowSelection?: boolean
  enableSorting?: boolean
  getRowId?: (row: TData) => string
  excludedRowIds?: readonly string[]
  showToolbar?: boolean
  showPager?: boolean
  styleVariant?: 'default' | 'reviewQueueDense'
}

function emptyPageInfo(pageSize: number) {
  return {
    pageSize,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  }
}

export function DocumentDataTable<TData extends MRT_RowData & { id: string }, TFilters>({
  definition,
  controller: providedController,
  initialQuery,
  initialData,
  emptyMessage = 'No documents found.',
  searchPlaceholder,
  leadingToolbarSlot,
  trailingToolbarSlot,
  rowSelection,
  onRowSelectionChange,
  enableRowSelection = false,
  enableSorting = true,
  getRowId,
  excludedRowIds,
  showToolbar = true,
  showPager = true,
  styleVariant = 'default',
}: DocumentDataTableProps<TData, TFilters>): ReactElement {
  const internalController = useDocumentTableController<TFilters>({ initialQuery })
  const controller = providedController ?? internalController
  const [data, setData] = useState<TData[]>(initialData?.data ?? [])
  const [pageInfo, setPageInfo] = useState(initialData?.pageInfo ?? emptyPageInfo(initialQuery.pageSize))
  const [isLoading, setIsLoading] = useState(!initialData)

  const shouldUseInitialData = useMemo(
    () => !!initialData && documentTableQueriesEqual(initialQuery, controller.query),
    [controller.query, initialData, initialQuery],
  )

  useEffect(() => {
    if (shouldUseInitialData && initialData) {
      setData(initialData.data)
      setPageInfo(initialData.pageInfo)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    definition
      .fetcher(controller.query)
      .then((result) => {
        if (cancelled) {
          return
        }

        setData(result.data)
        setPageInfo(result.pageInfo)
        setIsLoading(false)
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        setData([])
        setPageInfo(emptyPageInfo(controller.pageSize))
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [controller.currentQueryKey, controller.pageSize, controller.query, definition, initialData, shouldUseInitialData])

  const columns = useMemo<MRT_ColumnDef<TData>[]>(() => {
    if (!definition.renderRowActions) {
      return definition.columns
    }

    return [
      ...definition.columns,
      {
        id: 'row_actions',
        header: definition.rowActionsHeader ?? 'Actions',
        size: definition.rowActionsColumnSize ?? 220,
        enableSorting: false,
        Cell: ({ row }) => definition.renderRowActions?.(row.original) ?? null,
      },
    ]
  }, [definition])

  const excludedRowIdSet = useMemo(() => new Set(excludedRowIds ?? []), [excludedRowIds])
  const visibleData = useMemo(
    () =>
      excludedRowIdSet.size === 0
        ? data
        : data.filter((row) => !(getRowId ? excludedRowIdSet.has(getRowId(row)) : excludedRowIdSet.has(row.id))),
    [data, excludedRowIdSet, getRowId],
  )

  const table = useMaterialReactTable({
    columns,
    data: visibleData,
    ...buildDocumentTableMrtOptions({
      columns,
      data: visibleData,
      emptyMessage,
      styleVariant,
    }),
    enableSorting,
    enableRowSelection,
    getRowId: getRowId ?? ((row) => row.id),
    manualFiltering: true,
    manualPagination: true,
    manualSorting: enableSorting,
    onRowSelectionChange,
    onSortingChange: enableSorting ? controller.setSorting : undefined,
    state: {
      isLoading,
      rowSelection: rowSelection ?? {},
      sorting: enableSorting ? controller.sorting : [],
    },
  })

  return (
    <div>
      {showToolbar ? (
        <DocumentTableToolbar
          searchPlaceholder={searchPlaceholder}
          searchValue={controller.search}
          onSearchChange={controller.setSearch}
          pageSize={controller.pageSize}
          pageSizeOptions={DOCUMENT_TABLE_PAGE_SIZE_OPTIONS}
          onPageSizeChange={controller.setPageSize}
          totalCount={initialData?.totalCount}
          leadingSlot={leadingToolbarSlot}
          trailingSlot={trailingToolbarSlot}
        />
      ) : null}
      <MaterialReactTable table={table} />
      {showPager ? (
        <DocumentTableCursorPager
          page={controller.page}
          pageInfo={pageInfo}
          onPrevious={() => controller.goToPreviousPage(pageInfo.startCursor)}
          onNext={() => controller.goToNextPage(pageInfo.endCursor)}
        />
      ) : null}
    </div>
  )
}
