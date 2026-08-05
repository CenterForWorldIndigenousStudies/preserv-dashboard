import type { ReactElement } from 'react'
import { Box } from '@mui/material'

import type { PipelineStepRuntimeStatus } from '@lib/pipelineExecution'

export const STATUS_COLORS: Record<PipelineStepRuntimeStatus, string> = {
  pending: 'var(--cwis-text-disabled)',
  queued: 'var(--cwis-status-info-main)',
  running: 'var(--cwis-status-warning-main)',
  completed: 'var(--cwis-status-success-main)',
  failed: 'var(--cwis-status-error-main)',
  review_needed: 'var(--cwis-status-warning-text)',
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
