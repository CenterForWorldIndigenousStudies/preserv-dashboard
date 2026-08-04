import type { ReactElement } from 'react'
import { Stack, Typography } from '@mui/material'

import { Button } from '@atoms/Button'
import type { DocumentTablePageInfo } from '@organisms/DocumentTable/types'

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
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        mt: 2,
        color: 'text.secondary',
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="body2">Page {page}</Typography>
      <Stack direction="row" spacing={1}>
        <Button variant="ghost" size="sm" disabled={!pageInfo.hasPreviousPage} onClick={onPrevious}>
          {'Previous'}
        </Button>
        <Button variant="ghost" size="sm" disabled={!pageInfo.hasNextPage} onClick={onNext}>
          {'Next'}
        </Button>
      </Stack>
    </Stack>
  )
}
