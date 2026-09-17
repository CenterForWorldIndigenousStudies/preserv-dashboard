'use client'

import { useMemo, type ReactElement } from 'react'
import { Box, Typography } from '@mui/material'
import type { MRT_ColumnDef } from 'material-react-table'

import { Button } from '@atoms/Button'
import { getBatchDetailPath } from '@constants/paths'
import { EntityNameBlock } from '@molecules/EntityNameBlock'
import { DetailDataTable } from '@organisms/DetailDataTable'

import type { ReprocessingDraftDocument } from 'types/reprocessingDrafts'

interface ReprocessingDraftDocumentsTableProps {
  documents: readonly ReprocessingDraftDocument[]
  disabled?: boolean
  onRemove: (documentId: string) => void
}

export function ReprocessingDraftDocumentsTable({
  documents,
  disabled = false,
  onRemove,
}: ReprocessingDraftDocumentsTableProps): ReactElement {
  const columns = useMemo<MRT_ColumnDef<ReprocessingDraftDocument>[]>(
    () => [
      {
        id: 'document',
        accessorFn: (row) => row.name ?? row.idLegacy ?? row.id,
        header: 'Document',
        size: 360,
        Cell: ({ row }) => (
          <EntityNameBlock
            name={row.original.name}
            id={row.original.id}
            legacyId={row.original.idLegacy}
            fallbackName={'Untitled document'}
          />
        ),
      },
      {
        id: 'sourceBatch',
        accessorFn: (row) => row.sourceBatchName ?? row.sourceBatchLegacyId ?? row.sourceBatchId ?? '',
        header: 'Source batch',
        size: 320,
        Cell: ({ row }) =>
          row.original.sourceBatchId ? (
            <EntityNameBlock
              name={row.original.sourceBatchName}
              id={row.original.sourceBatchId}
              legacyId={row.original.sourceBatchLegacyId}
              fallbackName={'Untitled batch'}
              href={getBatchDetailPath(row.original.sourceBatchId)}
            />
          ) : (
            <Typography color={'text.secondary'}>{'-'}</Typography>
          ),
      },
      {
        id: 'remove',
        header: 'Remove',
        size: 120,
        enableSorting: false,
        Cell: ({ row }) => (
          <Button
            variant={'ghost'}
            size={'sm'}
            aria-label={`Remove ${row.original.name ?? row.original.id} from draft`}
            disabled={disabled}
            onClick={() => onRemove(row.original.id)}
          >
            {'Remove'}
          </Button>
        ),
      },
    ],
    [disabled, onRemove],
  )

  return (
    <Box sx={{ mt: 3 }}>
      <Typography component={'h2'} variant={'h6'} sx={{ mb: 2 }}>
        {'Documents in this draft'}
      </Typography>
      <DetailDataTable
        columns={columns}
        data={[...documents]}
        emptyMessage={'Add at least one document before submitting.'}
        enableSorting
      />
    </Box>
  )
}
