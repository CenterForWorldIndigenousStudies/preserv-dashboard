'use client'

import { useMemo, type ReactElement } from 'react'
import type { MRT_ColumnDef } from 'material-react-table'
import Link from 'next/link'
import { Link as MuiLink, Typography } from '@mui/material'

import { DateAtom } from '@atoms/Date'
import { DocumentDataTable } from '@organisms/DocumentTable/DocumentDataTable'
import type { FailureItem } from 'types/documents'
import { FAILED_PATH, getDocumentDetailPath } from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'

interface FailuresDocumentTableProps {
  failures: FailureItem[]
}

export function FailuresDocumentTable({ failures }: FailuresDocumentTableProps): ReactElement {
  const columns = useMemo<MRT_ColumnDef<FailureItem>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Document ID',
        size: 220,
        Cell: ({ row }) => (
          <MuiLink
            component={Link}
            href={getDocumentDetailPath(row.original.id, FAILED_PATH, PAGE_LABELS.processingFailures)}
            underline="hover"
            sx={{ color: 'primary.main', fontWeight: 500, '&:hover': { color: 'text.primary' } }}
          >
            {row.original.id}
          </MuiLink>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        size: 280,
        Cell: ({ row }) => row.original.name || '\u2014',
      },
      {
        accessorKey: 'failure_reason',
        header: 'Failure Reason',
        size: 360,
        Cell: ({ row }) => (
          <Typography component="span" variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {row.original.failure_reason || 'Unknown'}
          </Typography>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        size: 180,
        Cell: ({ row }) => <DateAtom value={row.original.created_at} />,
      },
    ],
    [],
  )

  const initialData = useMemo(
    () => ({
      data: failures,
      totalCount: failures.length,
      pageInfo: {
        pageSize: failures.length,
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
    }),
    [failures],
  )

  return (
    <DocumentDataTable<FailureItem, Record<string, never>>
      definition={{
        tableId: 'failures-documents',
        columns,
        fetcher: () => Promise.resolve(initialData),
      }}
      initialData={initialData}
      initialQuery={{
        page: 1,
        pageSize: failures.length,
        filters: {},
      }}
      emptyMessage="There are no failure records to display yet."
      enableSorting={false}
      showToolbar={false}
      showPager={false}
    />
  )
}
