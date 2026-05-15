import type { ReactElement, ReactNode } from 'react'

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
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-64 rounded-lg border border-[#355834]/20 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#355834]/30"
        />
        {leadingSlot}
        {typeof totalCount === 'number' ? <TableStat label="results" value={totalCount} /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {trailingSlot}
        <DocumentTablePageSizeSelect
          options={pageSizeOptions}
          value={pageSize}
          onChange={onPageSizeChange}
        />
      </div>
    </div>
  )
}
