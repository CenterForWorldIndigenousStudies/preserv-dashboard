import type { ReactElement } from 'react'
import { Box } from '@mui/material'

import type { PipelineStepRuntimeStatus } from '@lib/pipelineExecution'

export const STATUS_COLORS: Record<PipelineStepRuntimeStatus, string> = {
  pending: '#e0e0e0',
  queued: '#94d9f8',
  running: '#ff7637',
  completed: '#355834',
  failed: '#e96954',
  review_needed: '#8d5f58',
}

export function StatusDot({ status }: { status: PipelineStepRuntimeStatus }): ReactElement {
  return (
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor: STATUS_COLORS[status],
        flexShrink: 0,
      }}
    />
  )
}