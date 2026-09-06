import type { ReactElement, ReactNode } from 'react'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'

import { MetadataNameWithNotes } from '@molecules/MetadataNameWithNotes'
import { parseMetadataValue } from '@lib/metadata'
import type { MetadataField } from 'types/metadata'

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

interface MetadataTableProps {
  fields: MetadataField[]
  emptyMessage?: string
  minWidth?: number
  renderValue?: (field: MetadataField) => ReactNode
}

export function MetadataTable({
  fields,
  emptyMessage = 'No metadata available.',
  minWidth = 560,
  renderValue = (field) => parseMetadataValue(field.value, field.value_type).display,
}: MetadataTableProps): ReactElement {
  if (fields.length === 0) {
    return (
      <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 2 }}>
        {emptyMessage}
      </Typography>
    )
  }

  return (
    <TableContainer sx={{ mt: 3, overflowX: 'auto' }}>
      <Table size={'small'} sx={{ minWidth }}>
        <TableHead>
          <TableRow>
            <TableCell scope={'col'} sx={tableHeaderCellSx}>
              {'Field'}
            </TableCell>
            <TableCell scope={'col'} sx={tableHeaderCellSx}>
              {'Value'}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow key={`${field.name}-${index}`}>
              <TableCell component={'th'} scope={'row'} sx={{ ...tableBodyCellSx, fontWeight: 500 }}>
                <MetadataNameWithNotes name={field.name} notes={field.notes} />
              </TableCell>
              <TableCell sx={tableBodyCellSx}>{renderValue(field)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
