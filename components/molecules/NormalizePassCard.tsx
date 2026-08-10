'use client'

import { type ReactElement, useCallback } from 'react'
import { Box, Checkbox, FormControlLabel, Paper, Typography } from '@mui/material'

import type { NormalizePassState } from '@lib/pipelineConfig'
import { NORMALIZE_PASS_1_SUB_OPTIONS, NORMALIZE_PASS_2_SUB_OPTIONS } from '@constants/pipeline'

interface NormalizePassCardProps {
  passNumber: 1 | 2
  state: NormalizePassState
  helperText: string | null
  disabled?: boolean
  onToggle: (enabled: boolean) => void
  onSubOptionToggle: (subOption: 'split' | 'rotate', value: boolean) => void
  onAdvancedToggle: (open: boolean) => void
}

export function NormalizePassCard({
  passNumber,
  state,
  helperText,
  disabled = false,
  onToggle,
  onSubOptionToggle,
  onAdvancedToggle,
}: NormalizePassCardProps): ReactElement {
  const subOptions = passNumber === 1 ? NORMALIZE_PASS_1_SUB_OPTIONS : NORMALIZE_PASS_2_SUB_OPTIONS

  const handleCheckboxChange = useCallback(
    (_event: unknown, checked: boolean) => {
      onToggle(checked)
    },
    [onToggle],
  )

  const handleSplitChange = useCallback(
    (_event: unknown, checked: boolean) => {
      onSubOptionToggle('split', checked)
    },
    [onSubOptionToggle],
  )

  const handleRotateChange = useCallback(
    (_event: unknown, checked: boolean) => {
      onSubOptionToggle('rotate', checked)
    },
    [onSubOptionToggle],
  )

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: state.enabled ? 'primary.main' : 'divider',
        borderRadius: 3,
        overflow: 'hidden',
        opacity: disabled && !state.enabled ? 0.6 : 1,
      }}
    >
      {/* Main header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          bgcolor: state.enabled ? 'action.selected' : 'transparent',
        }}
      >
        <Checkbox
          checked={state.enabled}
          onChange={handleCheckboxChange}
          disabled={disabled}
          slotProps={{ input: { 'aria-label': `Enable Normalize Pass ${passNumber}` } }}
          size={'small'}
        />
        <Box sx={{ flex: 1 }}>
          <Typography variant={'body1'} sx={{ fontWeight: 600 }}>
            Normalize Pass {passNumber}
          </Typography>
          <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
            {passNumber === 1 ? 'Split and rotate original documents' : 'Split and rotate artifacts from Pass 1'}
          </Typography>
          {helperText && (
            <Typography variant={'caption'} sx={{ color: 'text.primary', mt: 0.5 }}>
              {helperText}
            </Typography>
          )}
        </Box>

        {/* Advanced toggle - only show when enabled */}
        {state.enabled && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              variant={'caption'}
              sx={{
                color: 'primary.main',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                userSelect: 'none',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => onAdvancedToggle(!state.advancedOpen)}
            >
              {'Advanced'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Advanced options - only shown when expanded */}
      {state.enabled && state.advancedOpen && (
        <Box sx={{ px: 2, pb: 2, borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
          <Box sx={{ pl: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {subOptions.map((option) => (
              <Paper
                key={option.id}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'background.default',
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={option.id === 'split' ? state.subSelection.split : state.subSelection.rotate}
                      onChange={option.id === 'split' ? handleSplitChange : handleRotateChange}
                      slotProps={{ input: { 'aria-label': option.label } }}
                      size={'small'}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant={'body2'} sx={{ fontWeight: 600 }}>
                        {option.label}
                      </Typography>
                      <Typography variant={'caption'} sx={{ color: 'text.secondary' }}>
                        {option.description}
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
                />
              </Paper>
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  )
}
