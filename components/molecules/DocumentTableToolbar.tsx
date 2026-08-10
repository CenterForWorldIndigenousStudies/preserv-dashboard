import type { ReactElement, ReactNode } from 'react'
import { Stack, TextField } from '@mui/material'

import { TableStat } from '@atoms/TableStat'
import { DocumentTablePageSizeSelect } from '@molecules/DocumentTablePageSizeSelect'

interface DocumentTableToolbarProps {
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (value: string) => void
  pageSize: number
  pageSizeOptions: readonly number[]
  onPageSizeChange: (value: number) => void
  totalCount?: number
  leadingSlot?: ReactNode
  trailingSlot?: ReactNode
}

export function DocumentTableToolbar({
  searchPlaceholder = 'Search documents',
  searchValue,
  onSearchChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  totalCount,
  leadingSlot,
  trailingSlot,
}: DocumentTableToolbarProps): ReactElement {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      sx={{
        alignItems: { xs: 'stretch', md: 'center' },
        justifyContent: 'space-between',
        mb: 2,
      }}
    >
      <Stack direction={'row'} spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          type={'search'}
          size={'small'}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          slotProps={{ htmlInput: { 'aria-label': searchPlaceholder } }}
          sx={{ width: { xs: '100%', sm: 256 } }}
        />
        {leadingSlot}
        {typeof totalCount === 'number' ? <TableStat label={'results'} value={totalCount} /> : null}
      </Stack>
      <Stack direction={'row'} spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {trailingSlot}
        <DocumentTablePageSizeSelect options={pageSizeOptions} value={pageSize} onChange={onPageSizeChange} />
      </Stack>
    </Stack>
  )
}
