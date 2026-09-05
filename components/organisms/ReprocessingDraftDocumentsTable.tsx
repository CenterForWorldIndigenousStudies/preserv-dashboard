'use client'

import { type ReactElement } from 'react'
import { Box, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { Button } from '@atoms/Button'

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
  return (
    <Paper variant={'outlined'}>
      <Box sx={{ p: 2 }}>
        <Typography component={'h2'} variant={'h6'}>{'Documents in this draft'}</Typography>
      </Box>
      <Table size={'small'}>
        <TableHead>
          <TableRow>
            <TableCell>{'Document'}</TableCell>
            <TableCell>{'Source batch'}</TableCell>
            <TableCell align={'right'}>{'Remove'}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell>
                <Stack>
                  <Typography variant={'body2'}>{document.name ?? document.id}</Typography>
                  <Typography variant={'caption'} color={'text.secondary'}>{document.idLegacy ?? document.id}</Typography>
                </Stack>
              </TableCell>
              <TableCell>{document.sourceBatchName ?? '-'}</TableCell>
              <TableCell align={'right'}>
                <Button
                  variant={'ghost'}
                  size={'sm'}
                  aria-label={`Remove ${document.name ?? document.id} from draft`}
                  disabled={disabled}
                  onClick={() => onRemove(document.id)}
                >
                  {'Remove'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {documents.length === 0 ? (
            <TableRow><TableCell colSpan={3}><Typography color={'text.secondary'}>{'Add at least one document before submitting.'}</Typography></TableCell></TableRow>
          ) : null}
        </TableBody>
      </Table>
    </Paper>
  )
}
