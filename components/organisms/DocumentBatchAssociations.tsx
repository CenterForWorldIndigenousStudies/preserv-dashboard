import type { ReactElement } from 'react'
import Link from 'next/link'

import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'

import { Cost } from '@atoms/Cost'
import { getBatchDetailPath } from '@constants/paths'
import type { DocumentToBatch } from 'types/documents'

const tableHeaderCellSx = {
  backgroundColor: 'background.default',
  borderBottom: '2px solid',
  borderBottomColor: 'primary.main',
  color: 'text.primary',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.1em',
  px: 1.5,
  py: 1,
  textTransform: 'uppercase' as const,
}

const tableBodyCellSx = {
  borderBottom: '1px solid',
  borderColor: 'divider',
  px: 1.5,
  py: 1.5,
  verticalAlign: 'top',
}

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
  if (batchAssociations.length === 0) {
    return (
      <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 3 }}>
        {'No batches are associated with this document.'}
      </Typography>
    )
  }

  return (
    <TableContainer sx={{ mt: 3, overflowX: 'auto' }}>
      <Table size={'small'} sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow>
            <TableCell scope={'col'} sx={tableHeaderCellSx}>
              {'Batch'}
            </TableCell>
            <TableCell scope={'col'} sx={tableHeaderCellSx}>
              {'Batch Origin'}
            </TableCell>
            <TableCell scope={'col'} sx={tableHeaderCellSx}>
              {'Processing Time'}
            </TableCell>
            <TableCell scope={'col'} sx={tableHeaderCellSx}>
              {'Status'}
            </TableCell>
            <TableCell scope={'col'} sx={tableHeaderCellSx}>
              {'Document Cost'}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {batchAssociations.map((batchLink) => (
            <TableRow key={batchLink.id}>
              <TableCell sx={{ ...tableBodyCellSx, fontWeight: 500 }}>
                <Link href={getBatchDetailPath(batchLink.batch_id, batchReturnHref, batchReturnLabel)}>
                  {batchLink.batch_name ?? batchLink.batch_legacy_id ?? batchLink.batch_id}
                </Link>
              </TableCell>
              <TableCell sx={tableBodyCellSx}>{batchLink.batch_origin ?? '—'}</TableCell>
              <TableCell sx={tableBodyCellSx}>{batchLink.processing_time_seconds ?? '—'}</TableCell>
              <TableCell sx={tableBodyCellSx}>{batchLink.batch_status ?? '—'}</TableCell>
              <TableCell sx={tableBodyCellSx}>
                <Cost value={batchLink.cost} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
