import type { ReactElement, ReactNode } from 'react'
import { Stack } from '@mui/material'

import { TableStat } from '@atoms/TableStat'

interface DocumentTableAdvancedSearchTriggerProps {
  activeFilterCount?: number
  children: ReactNode
}

export function DocumentTableAdvancedSearchTrigger({
  activeFilterCount = 0,
  children,
}: DocumentTableAdvancedSearchTriggerProps): ReactElement {
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      {children}
      {activeFilterCount > 0 ? <TableStat label="active filters" value={activeFilterCount} /> : null}
    </Stack>
  )
}
