'use client'

import { type ReactElement, useCallback } from 'react'
import { Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from '@mui/material'

import { PIPELINE_PROFILES, type ProfileId } from '@constants/pipeline'
import { getEnabledSteps, type PipelineSelectionDraft } from '@lib/pipelineConfig'

interface PipelineProfileSelectorProps {
  draft: PipelineSelectionDraft
  onProfileChange: (profileId: ProfileId) => void
  onConvertToCustom: () => void
  onOpenStepsModal: () => void
}

export function PipelineProfileSelector({
  draft,
  onProfileChange,
  onConvertToCustom,
  onOpenStepsModal,
}: PipelineProfileSelectorProps): ReactElement {
  const handleChange = useCallback(
    (event: { target: { value: unknown } }) => {
      const newId = event.target.value as ProfileId
      onProfileChange(newId)
    },
    [onProfileChange],
  )

  const selectedProfile = PIPELINE_PROFILES.find((profile) => profile.id === draft.profileId)
  const isCustomMode = draft.mode === 'custom' || draft.profileId === 'custom'
  const enabledSteps = getEnabledSteps(draft)
  const previewSteps = enabledSteps.slice(0, 3)
  const remainingStepsCount = Math.max(enabledSteps.length - previewSteps.length, 0)
  const configuredStepsLabel = enabledSteps.length === 1 ? 'Ingest only' : `${enabledSteps.length} steps configured`

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 4,
        p: 3,
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.16em' }}>
            Processing Profile
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.5 }}>
            Choose a pipeline profile
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            Select a preset or build a custom pipeline step by step.
          </Typography>
        </Box>

        <FormControl fullWidth>
          <InputLabel id="pipeline-profile-select-label">Profile</InputLabel>
          <Select
            labelId="pipeline-profile-select-label"
            id="pipeline-profile-select"
            value={draft.profileId}
            label="Profile"
            onChange={handleChange}
          >
            {PIPELINE_PROFILES.map((profile) => (
              <MenuItem key={profile.id} value={profile.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {profile.label}
                  </Typography>
                  {profile.id === 'custom' && (
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: 'secondary.main',
                        color: 'ink.main',
                      }}
                    >
                      Most Flexible
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedProfile && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {selectedProfile.description}
          </Typography>
        )}

        <Stack spacing={1.5}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1.5,
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Pipeline Steps
              </Typography>
              <Chip label={configuredStepsLabel} size="small" variant="outlined" />
            </Box>
            <Button variant="contained" onClick={onOpenStepsModal} sx={{ borderRadius: 3 }}>
              Configure Steps
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {previewSteps.map((step) => (
              <Chip
                key={step}
                label={step}
                size="small"
                variant={step === 'Ingest' ? 'outlined' : 'filled'}
                sx={{
                  bgcolor: step === 'Ingest' ? 'transparent' : 'primary.main',
                  color: step === 'Ingest' ? 'text.secondary' : 'white',
                  fontWeight: 500,
                }}
              />
            ))}
            {remainingStepsCount > 0 && <Chip label={`+${remainingStepsCount} more`} size="small" variant="outlined" />}
          </Box>
        </Stack>

        {draft.mode === 'preset' && draft.profileId !== 'custom' && (
          <Box>
            <Button variant="outlined" size="small" onClick={onConvertToCustom} sx={{ borderRadius: 3 }}>
              Convert to Custom
            </Button>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
              Fine tune this preset for the current run, or convert it into a custom profile.
            </Typography>
          </Box>
        )}

        {isCustomMode && draft.mode === 'custom' && (
          <Typography
            variant="body2"
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'secondary.main',
              color: 'ink.main',
              fontWeight: 500,
            }}
          >
            Custom mode: configure the exact steps you want in the pipeline.
          </Typography>
        )}
      </Stack>
    </Paper>
  )
}
