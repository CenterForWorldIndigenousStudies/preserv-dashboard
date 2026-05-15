import type { ReactElement, ReactNode } from 'react'

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
    <div className="flex flex-wrap items-center gap-2">
      {children}
      {activeFilterCount > 0 ? <TableStat label="active filters" value={activeFilterCount} /> : null}
    </div>
  )
}
