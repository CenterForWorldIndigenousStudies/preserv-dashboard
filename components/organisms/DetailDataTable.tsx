'use client'

import type { ReactElement } from 'react'
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef, type MRT_RowData } from 'material-react-table'

import { buildDocumentTableMrtOptions } from './DocumentTable/buildDocumentTableMrtOptions'

interface DetailDataTableProps<TData extends MRT_RowData> {
  columns: MRT_ColumnDef<TData>[]
  data: TData[]
  emptyMessage: string
  enableSorting?: boolean
}

/** Presentational table for static detail-page data without search or pagination controls. */
export function DetailDataTable<TData extends MRT_RowData>({
  columns,
  data,
  emptyMessage,
  enableSorting = false,
}: DetailDataTableProps<TData>): ReactElement {
  const table = useMaterialReactTable({
    ...buildDocumentTableMrtOptions({ columns, data, emptyMessage }),
    columns,
    data,
    enableSorting,
  })

  return <MaterialReactTable table={table} />
}
