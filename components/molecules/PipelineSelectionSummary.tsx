'use client'

import { type ReactElement } from 'react'
import { Alert, Box, Chip, Paper, Stack, Typography } from '@mui/material'

import { getEnabledSteps, type PipelineSelectionDraft } from '@lib/pipelineConfig'
import { PIPELINE_PROFILES } from '@constants/pipeline'

interface PipelineSelectionSummaryProps {
  draft: PipelineSelectionDraft
}

export function PipelineSelectionSummary({ draft }: PipelineSelectionSummaryProps): ReactElement {
  const enabledSteps = getEnabledSteps(draft)
  const profile = PIPELINE_PROFILES.find((p) => p.id === draft.profileId)

  if (enabledSteps.length <= 1) {
    return (
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          p: 2,
        }}
      >
        <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
          {'No additional steps selected beyond Ingest. Use the step list in this dialog to build your pipeline.'}
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 2,
      }}
    >
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant={'body2'} sx={{ fontWeight: 600 }}>
            {'Pipeline Summary'}
          </Typography>
          {profile && profile.id !== 'custom' && (
            <Chip
              label={profile.label}
              size={'small'}
              sx={{
                bgcolor: 'secondary.main',
                color: 'text.primary',
                fontWeight: 500,
              }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {enabledSteps.map((step, index) => (
            <Chip
              key={`${step}-${index}`}
              label={step}
              size={'small'}
              variant={step === 'Ingest' ? 'outlined' : 'filled'}
              sx={{
                bgcolor: step === 'Ingest' ? 'transparent' : 'primary.main',
                color: step === 'Ingest' ? 'text.secondary' : 'white',
                fontWeight: 500,
              }}
            />
          ))}
        </Box>

        {draft.mode === 'preset' && draft.profileId !== 'custom' && (
          <Alert severity={'info'} sx={{ borderRadius: 2 }}>
            <Typography variant={'body2'}>
              {
                'This preset starts with the steps shown above, and you can fine tune them here before converting to custom.'
              }
            </Typography>
          </Alert>
        )}
      </Stack>
    </Paper>
  )
}
