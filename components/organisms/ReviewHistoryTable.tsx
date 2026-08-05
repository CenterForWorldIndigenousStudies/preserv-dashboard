'use client'

import { useMemo } from 'react'
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table'
import { alpha, type Theme } from '@mui/material/styles'
import { DateAtom } from '@atoms/Date'
import { StateBadge } from '@atoms/Badges/StateBadge'
import type { ReviewItem } from 'types/documents'

const mrtTableHeadCellSx = (theme: Theme) => ({
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  borderBottom: `2px solid ${theme.palette.primary.main}`,
})

const mrtTableBodyCellSx = (theme: Theme) => ({
  color: theme.palette.text.primary,
  fontSize: '0.875rem',
  borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
})

export function ReviewHistoryTable({ reviews }: { reviews: ReviewItem[] }) {
  const columns = useMemo<MRT_ColumnDef<ReviewItem>[]>(
    () => [
      {
        accessorKey: 'field_name',
        header: 'Field',
        size: 160,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 140,
        Cell: ({ row }) => <StateBadge state={row.original.status} />,
      },
      {
        accessorKey: 'winning_source',
        header: 'Winning Source',
        size: 160,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '') || '—',
      },
      {
        accessorKey: 'winning_value',
        header: 'Winning Value',
        size: 200,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '') || '—',
      },
      {
        accessorKey: 'created_at',
        header: 'Created At',
        size: 180,
        Cell: ({ renderedCellValue }) => <DateAtom value={renderedCellValue as ReviewItem['created_at']} />,
      },
      {
        accessorKey: 'conflicting_values',
        header: 'Conflicts',
        size: 120,
        Cell: ({ row }) => {
          const count = row.original.conflicting_values?.length ?? 0
          if (count === 0) return '—'
          return `${count} conflict${count !== 1 ? 's' : ''}`
        },
      },
    ],
    [],
  )

  const table = useMaterialReactTable({
    columns,
    data: reviews,
    enablePagination: false,
    enableSorting: false,
    enableGlobalFilter: false,
    muiTableHeadCellProps: {
      sx: mrtTableHeadCellSx,
    },
    muiTableBodyCellProps: {
      sx: mrtTableBodyCellSx,
    },
    muiTableContainerProps: {
      sx: (theme: Theme) => ({
        borderRadius: '0.75rem',
        border: 1,
        borderColor: alpha(theme.palette.primary.main, 0.125),
      }),
    },
    localization: {
      noRecordsToDisplay: 'No review items found.',
    },
  })

  return <MaterialReactTable table={table} />
}
