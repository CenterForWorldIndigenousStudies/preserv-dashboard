import type { ReactElement } from 'react'
import { Box, Stack, Typography } from '@mui/material'

import { ProcessBatchProgress } from '@organisms/ProcessBatchProgress'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

interface ProcessBatchMonitorProps {
  batches: ProcessBatchStatus[]
  onRollbackRequested?: () => void
  showExecutionActions?: boolean
}

export function ProcessBatchMonitor({
  batches,
  onRollbackRequested,
  showExecutionActions = true,
}: ProcessBatchMonitorProps): ReactElement {
  if (batches.length === 0) {
    return (
      <Box
        sx={{
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
          backgroundColor: 'background.default',
          p: 3,
        }}
      >
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
          {'No recent batches are available yet.'}
        </Typography>
        <Typography sx={{ mt: 1, fontSize: '0.875rem', lineHeight: 1.6, color: 'text.secondary' }}>
          {
            'Launch a batch from Process to start activity here, then use Batches for deeper monitoring once work is underway.'
          }
        </Typography>
      </Box>
    )
  }

  return (
    <Stack spacing={3}>
      {batches.map((batch) => (
        <ProcessBatchProgress
          key={batch.batchId}
          initialBatch={batch}
          processingDetails={batch.processingProperties}
          onRollbackRequested={onRollbackRequested}
          showExecutionActions={showExecutionActions}
        />
      ))}
    </Stack>
  )
}
