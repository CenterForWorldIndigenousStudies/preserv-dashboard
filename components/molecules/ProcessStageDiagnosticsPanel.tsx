import type { ReactElement } from 'react'
import { Box, List, ListItem, Paper, Typography } from '@mui/material'

import type { ProcessStageStatus } from 'types/pipelineContracts'

interface ProcessStageDiagnosticsPanelProps {
  stage: ProcessStageStatus
}

export function ProcessStageDiagnosticsPanel({ stage }: ProcessStageDiagnosticsPanelProps): ReactElement | null {
  const waveOneFailures = stage.openaiBatchWave1?.failures ?? []
  const waveTwoFailures = stage.openaiBatchWave2?.failures ?? []

  if (!stage.error && !stage.callbackErrorMessage && waveOneFailures.length === 0 && waveTwoFailures.length === 0) {
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

      {waveOneFailures.length > 0 ? (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(29, 42, 47, 0.05)' }}>
          <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
            Wave 1 failures
          </Typography>
          <List dense disablePadding>
            {waveOneFailures.map((failure, index) => (
              <ListItem key={`${failure.documentId ?? 'wave-1'}-${index}`} disablePadding sx={{ py: 0.5 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {(failure.filename ?? failure.documentId ?? `Document ${index + 1}`) + ': '}
                  {failure.reason ?? 'Unknown failure'}
                </Typography>
              </ListItem>
            ))}
          </List>
        </Paper>
      ) : null}

      {waveTwoFailures.length > 0 ? (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(29, 42, 47, 0.05)' }}>
          <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
            Wave 2 failures
          </Typography>
          <List dense disablePadding>
            {waveTwoFailures.map((failure, index) => (
              <ListItem key={`${failure.documentId ?? 'wave-2'}-${index}`} disablePadding sx={{ py: 0.5 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {(failure.filename ?? failure.documentId ?? `Document ${index + 1}`) + ': '}
                  {failure.reason ?? 'Unknown failure'}
                </Typography>
              </ListItem>
            ))}
          </List>
        </Paper>
      ) : null}
    </>
  )
}
