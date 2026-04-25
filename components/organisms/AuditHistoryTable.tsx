'use client'

import { useMemo } from 'react'
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from 'material-react-table'
import { DateAtom } from '@atoms/Date'
import type { AuditEntry } from '@lib/types'

const mrtTableHeadCellSx = {
  backgroundColor: '#f4f1f0',
  color: '#231f20',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  borderBottom: '2px solid #355834',
}

const mrtTableBodyCellSx = {
  color: '#231f20',
  fontSize: '0.875rem',
  borderBottom: '1px solid rgba(53,88,52,0.10)',
}

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
        Cell: ({ renderedCellValue }) =>
          String((renderedCellValue as string | null) ?? '') || '—',
      },
      {
        accessorKey: 'after_value',
        header: 'After',
        size: 200,
        Cell: ({ renderedCellValue }) =>
          String((renderedCellValue as string | null) ?? '') || '—',
      },
      {
        accessorKey: 'changed_at',
        header: 'Changed At',
        size: 180,
        Cell: ({ renderedCellValue }) => (
          <DateAtom value={renderedCellValue as AuditEntry['changed_at']} />
        ),
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
      sx: { borderRadius: '0.75rem', border: '1px solid rgba(53,88,52,0.125)' },
    },
    localization: {
      noRecordsToDisplay: 'No audit entries found.',
    },
  })

  return <MaterialReactTable table={table} />
}