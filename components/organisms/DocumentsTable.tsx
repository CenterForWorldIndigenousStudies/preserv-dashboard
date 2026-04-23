'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  type MRT_SortingState,
} from 'material-react-table'
import Link from 'next/link'
import { getDocumentsAction } from '@actions/documents'
import type { Document } from '@lib/types'
import type { DocumentsQueryParams } from '@lib/queries'
import { formatBytes, formatDateTime } from '@lib/format'

interface DocumentsTableProps {
  initialData?: { data: Document[]; total: number }
}

export function DocumentsTable({ initialData }: DocumentsTableProps) {
  const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 25 })
  const [sorting, setSorting] = useState<MRT_SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowCount, setRowCount] = useState(initialData?.total ?? 0)
  const [data, setData] = useState<Document[]>(initialData?.data ?? [])

  const columns = useMemo<MRT_ColumnDef<Document>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 120,
        Cell: ({ renderedCellValue }) => {
          const val = String((renderedCellValue as string | null) ?? '')
          return <span title={val}>{val.length > 8 ? `${val.slice(0, 8)}...` : val}</span>
        },
      },
      {
        accessorKey: 'name',
        header: 'Name',
        size: 280,
        Cell: ({ row }) => {
          const val = row.original.name
          if (!val) return '—'
          return (
            <Link href={`/documents/${row.original.id}`} style={{ color: '#355834' }}>
              {val}
            </Link>
          )
        },
      },
      {
        accessorKey: 'id_legacy',
        header: 'Legacy ID',
        size: 180,
        Cell: ({ renderedCellValue }) => {
          const val = String((renderedCellValue as string | null) ?? '')
          if (!val) return '—'
          return <span title={val}>{val.length > 30 ? `${val.slice(0, 30)}...` : val}</span>
        },
      },
      {
        accessorKey: 'source_id',
        header: 'Source ID',
        size: 150,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '') || '—',
      },
      {
        accessorKey: 'filesize',
        header: 'Size',
        size: 110,
        Cell: ({ renderedCellValue }) => formatBytes(renderedCellValue as number | null),
      },
      {
        accessorKey: 'hash_binary',
        header: 'Binary Hash',
        size: 180,
        Cell: ({ renderedCellValue }) => {
          const val = String((renderedCellValue as string | null) ?? '')
          if (!val) return '—'
          return (
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }} title={val}>
              {val.length > 20 ? `${val.slice(0, 20)}...` : val}
            </span>
          )
        },
      },
      {
        accessorKey: 'hash_content',
        header: 'Content Hash',
        size: 180,
        Cell: ({ renderedCellValue }) => {
          const val = String((renderedCellValue as string | null) ?? '')
          if (!val) return '—'
          return (
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }} title={val}>
              {val.length > 20 ? `${val.slice(0, 20)}...` : val}
            </span>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        size: 160,
        Cell: ({ renderedCellValue }) => formatDateTime(renderedCellValue as string | Date | null) ?? '—',
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated',
        size: 160,
        Cell: ({ renderedCellValue }) => formatDateTime(renderedCellValue as string | Date | null) ?? '—',
      },
    ],
    [],
  )

  const queryParams: DocumentsQueryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      orderBy: sorting[0]?.id as DocumentsQueryParams['orderBy'],
      sortDirection: sorting[0]?.desc ? ('desc' as const) : ('asc' as const),
      search: globalFilter || undefined,
    }),
    [pagination, sorting, globalFilter],
  )

  const shouldUseInitialData = initialData && pagination.pageIndex === 0 && !sorting.length && !globalFilter

  useEffect(() => {
    if (shouldUseInitialData) {
      setData(initialData.data)
      setRowCount(initialData.total)
      return
    }

    let cancelled = false
    getDocumentsAction(queryParams)
      .then((result: { data: Document[]; total: number }) => {
        if (!cancelled) {
          setData(result.data)
          setRowCount(result.total)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData([])
          setRowCount(0)
        }
      })
    return () => {
      cancelled = true
    }
  }, [queryParams, shouldUseInitialData, initialData])

  const table = useMaterialReactTable({
    columns,
    data,
    rowCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: { pagination, sorting, globalFilter },
    muiPaginationProps: {
      rowsPerPageOptions: [10, 25, 50, 100],
      variant: 'outlined',
    },
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: '#f4f1f0',
        color: '#231f20',
        fontWeight: 600,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        borderBottom: '2px solid #355834',
      },
    },
    muiTableBodyCellProps: {
      sx: { color: '#231f20', fontSize: '0.875rem' },
    },
    muiTableBodyProps: {
      sx: {
        '& tr:nth-of-type(even)': { backgroundColor: 'rgba(244,241,240,0.3)' },
        '& tr:hover': { backgroundColor: 'rgba(53,88,52,0.06)' },
      },
    },
    muiTableContainerProps: {
      sx: { borderRadius: '0.75rem', border: '1px solid rgba(53,88,52,0.125)' },
    },
    muiSearchTextFieldProps: {
      placeholder: 'Search documents...',
      sx: {
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(53,88,52,0.25)' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#355834' },
      },
    },
    localization: {
      noRecordsToDisplay: 'No documents found.',
      search: 'Search',
      of: 'of',
      rowsPerPage: 'Rows per page',
    },
    getRowId: (row) => row.id,
  })

  return <MaterialReactTable table={table} />
}
