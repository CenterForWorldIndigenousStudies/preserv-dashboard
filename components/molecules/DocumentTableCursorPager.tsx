import type { ReactElement } from 'react'

import { Button } from '@atoms/Button'
import type { DocumentTablePageInfo } from '@organisms/document-table/types'

interface DocumentTableCursorPagerProps {
  page: number
  pageInfo: DocumentTablePageInfo
  onNext: () => void
  onPrevious: () => void
}

export function DocumentTableCursorPager({
  page,
  pageInfo,
  onNext,
  onPrevious,
}: DocumentTableCursorPagerProps): ReactElement {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[#231f20]/60">
      <span>Page {page}</span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" disabled={!pageInfo.hasPreviousPage} onClick={onPrevious}>
          Previous
        </Button>
        <Button variant="ghost" size="sm" disabled={!pageInfo.hasNextPage} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  )
}
