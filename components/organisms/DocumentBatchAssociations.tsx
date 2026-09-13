'use client'

import { useMemo, type ReactElement } from 'react'
import Box from '@mui/material/Box'
import type { MRT_ColumnDef } from 'material-react-table'
import Link from 'next/link'

import { DateAtom } from '@atoms/Date'
import { Cost } from '@atoms/Cost'
import { ProcessingTime } from '@atoms/ProcessingTime'
import { StatusPill } from '@atoms/Badges/StatusPill'
import { getBatchDetailPath, getDocumentsBatchFilterPath } from '@constants/paths'
import { EntityNameBlock } from '@molecules/EntityNameBlock'
import { DetailDataTable } from '@organisms/DetailDataTable'
import type { DocumentToBatch } from 'types/documents'

interface DocumentBatchAssociationsProps {
  batchAssociations: DocumentToBatch[]
  batchReturnHref?: string
  batchReturnLabel?: string
}

export function DocumentBatchAssociations({
  batchAssociations,
  batchReturnHref,
  batchReturnLabel,
}: DocumentBatchAssociationsProps): ReactElement {
  const columns = useMemo<MRT_ColumnDef<DocumentToBatch>[]>(
    () => [
      {
        id: 'batch',
        accessorFn: (row) => row.batch_name ?? row.batch_legacy_id ?? row.batch_id,
        header: 'Batch',
        size: 360,
        Cell: ({ row }) => (
          <EntityNameBlock
            name={row.original.batch_name}
            id={row.original.batch_id}
            legacyId={row.original.batch_legacy_id}
            fallbackName={'Untitled batch'}
            href={getBatchDetailPath(row.original.batch_id, batchReturnHref, batchReturnLabel)}
          />
        ),
      },
      {
        accessorKey: 'batch_status',
        header: 'Status',
        size: 150,
        Cell: ({ row }) => <StatusPill status={row.original.batch_status} />,
      },
      {
        accessorKey: 'batch_started_at',
        header: 'Started',
        size: 180,
        Cell: ({ row }) => <DateAtom value={row.original.batch_started_at} />,
      },
      {
        id: 'documentCount',
        accessorFn: (row) => row.batch_document_count,
        header: 'Documents',
        size: 130,
        Cell: ({ row }) => {
          const batchName = row.original.batch_name?.trim() || row.original.batch_legacy_id || row.original.batch_id
          return (
            <Link
              href={getDocumentsBatchFilterPath(batchName, batchReturnHref, batchReturnLabel)}
              style={{ color: 'var(--cwis-action-primary)' }}
            >
              {row.original.batch_document_count}
            </Link>
          )
        },
      },
      {
        id: 'cost',
        accessorFn: (row) => (row.cost === null ? undefined : Number(row.cost)),
        header: 'Document Cost',
        size: 160,
        Cell: ({ row }) => <Cost value={row.original.cost} />,
      },
      {
        accessorKey: 'processing_time_seconds',
        header: 'Processing Time',
        size: 180,
        Cell: ({ row }) => <ProcessingTime value={row.original.processing_time_seconds} />,
      },
    ],
    [batchReturnHref, batchReturnLabel],
  )

  return (
    <Box sx={{ mt: 3 }}>
      <DetailDataTable
        columns={columns}
        data={batchAssociations}
        emptyMessage={'No batches are associated with this document.'}
        enableSorting
      />
    </Box>
  )
}
