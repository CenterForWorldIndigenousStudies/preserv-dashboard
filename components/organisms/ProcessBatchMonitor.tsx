import type { ReactElement } from 'react'
import { Stack } from '@mui/material'

import { ProcessBatchStatusCard } from '@molecules/ProcessBatchStatusCard'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

interface ProcessBatchMonitorProps {
  batches: ProcessBatchStatus[]
}

export function ProcessBatchMonitor({ batches }: ProcessBatchMonitorProps): ReactElement {
  return (
    <Stack spacing={3}>
      {batches.map((batch) => (
        <ProcessBatchStatusCard key={batch.batchId} batch={batch} />
      ))}
    </Stack>
  )
}
