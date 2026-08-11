'use client'

import { type ReactElement, type ReactNode } from 'react'
import { Box, Stack } from '@mui/material'

interface ReviewQueueWorkspaceProps {
  needsReviewPanel: ReactNode
}

export function ReviewQueueWorkspace({ needsReviewPanel }: ReviewQueueWorkspaceProps): ReactElement {
  return (
    <Stack
      component={'section'}
      spacing={3}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '1.5rem',
        bgcolor: 'background.paper',
        p: 3,
      }}
    >
      <Box>{needsReviewPanel}</Box>
    </Stack>
  )
}
