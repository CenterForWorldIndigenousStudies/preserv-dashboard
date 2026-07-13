import type { ReactElement } from 'react'
import { Box, Stack, Typography } from '@mui/material'

import { ProcessBatchStatusCard } from '@molecules/ProcessBatchStatusCard'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

interface ProcessBatchMonitorProps {
  batches: ProcessBatchStatus[]
}

export function ProcessBatchMonitor({ batches }: ProcessBatchMonitorProps): ReactElement {
  if (batches.length === 0) {
    return (
      <Box
        sx={{
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'rgba(53, 88, 52, 0.2)',
          backgroundColor: 'rgba(244, 241, 240, 0.35)',
          p: 3,
        }}
      >
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'ink.main' }}>
          No recent batches are available yet.
        </Typography>
        <Typography sx={{ mt: 1, fontSize: '0.875rem', lineHeight: 1.6, color: 'text.secondary' }}>
          Launch a batch from Process to start activity here, then use Batches for deeper monitoring once work is
          underway.
        </Typography>
      </Box>
    )
  }

  return (
    <Stack spacing={3}>
      {batches.map((batch) => (
        <ProcessBatchStatusCard key={batch.batchId} batch={batch} />
      ))}
    </Stack>
  )
}
