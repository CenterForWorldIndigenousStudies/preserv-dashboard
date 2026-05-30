import type { ReactElement } from 'react'
import { Box, Paper, Typography } from '@mui/material'

import type { ProcessStageStatus } from 'types/pipelineContracts'

interface ProcessStageDiagnosticsPanelProps {
  stage: ProcessStageStatus
}

export function ProcessStageDiagnosticsPanel({ stage }: ProcessStageDiagnosticsPanelProps): ReactElement | null {
  if (!stage.error && !stage.callbackErrorMessage) {
    return null
  }

  return (
    <>
      {stage.error ? (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(156, 74, 63, 0.08)' }}>
          <Typography variant="body2" sx={{ color: '#9c4a3f' }}>
            {stage.error}
          </Typography>
        </Paper>
      ) : null}

      {stage.callbackErrorMessage ? (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(29, 42, 47, 0.05)' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Callback diagnostic:
            </Box>{' '}
            {stage.callbackErrorType ?? 'Error'}
            {stage.callbackHttpStatus ? ` (${stage.callbackHttpStatus})` : ''} — {stage.callbackErrorMessage}
          </Typography>
        </Paper>
      ) : null}
    </>
  )
}
