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
import { getReviewQueueAction } from '@actions/review-queue'
import type { ReviewQueueItem } from '@lib/types'

interface ReviewQueueTableProps {
  initialData?: { items: ReviewQueueItem[]; total: number }
}

export function ReviewQueueTable({ initialData }: ReviewQueueTableProps) {
  const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 25 })
  const [sorting, setSorting] = useState<MRT_SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowCount, setRowCount] = useState(initialData?.total ?? 0)
  const [data, setData] = useState<ReviewQueueItem[]>(initialData?.items ?? [])

  const queryParams = useMemo(() => ({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize }), [pagination])

  const shouldUseInitialData = initialData && pagination.pageIndex === 0 && !sorting.length && !globalFilter

  const columns = useMemo<MRT_ColumnDef<ReviewQueueItem>[]>(
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
        accessorKey: 'validation_status',
        header: 'Validation Status',
        size: 160,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '—'),
      },
      {
        accessorKey: 'validation_type',
        header: 'Validation Type',
        size: 140,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '—'),
      },
      {
        accessorKey: 'validator_name',
        header: 'Validator Name',
        size: 160,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '—'),
      },
      {
        accessorKey: 'validator_email',
        header: 'Validator Email',
        size: 180,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '—'),
      },
      {
        accessorKey: 'needs_review',
        header: 'Needs Review',
        size: 120,
        Cell: ({ renderedCellValue }) => {
          const val = renderedCellValue as boolean
          return val ? (
            <span
              style={{
                borderRadius: '9999px',
                backgroundColor: '#9e3f2f',
                color: 'white',
                padding: '2px 12px',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              Yes
            </span>
          ) : (
            <span style={{ color: 'rgba(35,31,32,0.5)' }}>No</span>
          )
        },
      },
      {
        accessorKey: 'sensitive',
        header: 'Sensitive',
        size: 110,
        Cell: ({ renderedCellValue }) => {
          const val = renderedCellValue as boolean
          return val ? (
            <span
              style={{
                borderRadius: '9999px',
                backgroundColor: '#231f20',
                color: '#f4f1f0',
                padding: '2px 12px',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              Yes
            </span>
          ) : (
            <span style={{ color: 'rgba(35,31,32,0.5)' }}>No</span>
          )
        },
      },
    ],
    [],
  )

  useEffect(() => {
    if (shouldUseInitialData) {
      setData(initialData.items)
      setRowCount(initialData.total)
      return
    }

    let cancelled = false
    getReviewQueueAction()
      .then((result: { items: ReviewQueueItem[]; total: number }) => {
        if (!cancelled) {
          setData(result.items)
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
      placeholder: 'Search review queue...',
      sx: {
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(53,88,52,0.25)' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#355834' },
      },
    },
    localization: {
      noRecordsToDisplay: 'No documents in review queue.',
      search: 'Search',
      of: 'of',
      rowsPerPage: 'Rows per page',
    },
    getRowId: (row) => row.id,
  })

  return <MaterialReactTable table={table} />
}
