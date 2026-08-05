'use client'

import { useMemo } from 'react'
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table'
import { alpha, type Theme } from '@mui/material/styles'
import { DateAtom } from '@atoms/Date'
import type { AuditEntry } from 'types/documents'

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

export function AuditHistoryTable({ audits }: { audits: AuditEntry[] }) {
  const columns = useMemo<MRT_ColumnDef<AuditEntry>[]>(
    () => [
      {
        accessorKey: 'field_name',
        header: 'Field',
        size: 160,
      },
      {
        accessorKey: 'source_name',
        header: 'Source',
        size: 160,
      },
      {
        accessorKey: 'before_value',
        header: 'Before',
        size: 200,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '') || '—',
      },
      {
        accessorKey: 'after_value',
        header: 'After',
        size: 200,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '') || '—',
      },
      {
        accessorKey: 'changed_at',
        header: 'Changed At',
        size: 180,
        Cell: ({ renderedCellValue }) => <DateAtom value={renderedCellValue as AuditEntry['changed_at']} />,
      },
    ],
    [],
  )

  const table = useMaterialReactTable({
    columns,
    data: audits,
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
      noRecordsToDisplay: 'No audit entries found.',
    },
  })

  return <MaterialReactTable table={table} />
}
