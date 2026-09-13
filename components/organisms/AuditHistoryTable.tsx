'use client'

import { useMemo } from 'react'
import type { MRT_ColumnDef } from 'material-react-table'
import { DateAtom } from '@atoms/Date'
import { AuditValuePopover } from '@molecules/AuditValuePopover'
import { DetailDataTable } from '@organisms/DetailDataTable'
import type { AuditEntry } from 'types/documents'

const INLINE_VALUE_LENGTH = 80

function renderAuditValue(value: string | null, label: 'before' | 'after') {
  const normalizedValue = value ?? ''

  if (!normalizedValue) {
    return '—'
  }

  if (normalizedValue.length > INLINE_VALUE_LENGTH || normalizedValue.includes('\n')) {
    return <AuditValuePopover value={normalizedValue} label={label} />
  }

  return normalizedValue
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
        accessorKey: 'editor_email',
        header: 'Editor',
        size: 200,
        Cell: ({ renderedCellValue }) => String((renderedCellValue as string | null) ?? '') || '—',
      },
      {
        accessorKey: 'before_value',
        header: 'Before',
        size: 200,
        Cell: ({ renderedCellValue }) => renderAuditValue(renderedCellValue as string | null, 'before'),
      },
      {
        accessorKey: 'after_value',
        header: 'After',
        size: 200,
        Cell: ({ renderedCellValue }) => renderAuditValue(renderedCellValue as string | null, 'after'),
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

  return <DetailDataTable columns={columns} data={audits} emptyMessage={'No audit entries found.'} />
}
