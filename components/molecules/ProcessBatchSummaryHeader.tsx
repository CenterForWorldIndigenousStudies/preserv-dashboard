import type { ReactElement } from 'react'
import { Box, Typography } from '@mui/material'

interface ProcessBatchSummaryHeaderProps {
  batchName: string
  batchId: string
  startedBy: string | null
}

export function ProcessBatchSummaryHeader({
  batchName,
  batchId,
  startedBy,
}: ProcessBatchSummaryHeaderProps): ReactElement {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.16em' }}
      >
        Batch
      </Typography>
      <Typography component="h2" variant="h5" sx={{ mt: 1 }}>
        {batchName || batchId}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
        {startedBy ?? 'Unknown starter'}
      </Typography>
    </Box>
  )
}
