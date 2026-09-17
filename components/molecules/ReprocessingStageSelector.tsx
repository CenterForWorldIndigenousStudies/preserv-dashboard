'use client'

import type { ReactElement } from 'react'
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'

import {
  getReprocessingDownstreamStages,
  getReprocessingStageLabel,
  REPROCESSING_STAGE_OPTIONS,
} from '@lib/reprocessingDrafts'
import type { CallbackStageKey } from 'types/pipelineContracts'

interface ReprocessingStageSelectorProps {
  restartStage: CallbackStageKey
  requestedStages: readonly CallbackStageKey[]
  disabled?: boolean
  onRestartStageChange: (stage: CallbackStageKey) => void
  onRequestedStagesChange: (stages: CallbackStageKey[]) => void
}

export function ReprocessingStageSelector({
  restartStage,
  requestedStages,
  disabled = false,
  onRestartStageChange,
  onRequestedStagesChange,
}: ReprocessingStageSelectorProps): ReactElement {
  const stages = getReprocessingDownstreamStages(restartStage)
  const selected = new Set(requestedStages)

  function handleRestartStageChange(stage: CallbackStageKey): void {
    onRestartStageChange(stage)
    onRequestedStagesChange(getReprocessingDownstreamStages(stage))
  }

  function handleStageChange(stage: CallbackStageKey, checked: boolean): void {
    const stageIndex = stages.indexOf(stage)
    if (stageIndex < 0) return

    onRequestedStagesChange(checked ? stages.slice(0, stageIndex + 1) : stages.slice(0, stageIndex))
  }

  return (
    <Stack spacing={2}>
      <FormControl fullWidth>
        <InputLabel id={'reprocessing-start-stage-label'}>{'Start stage'}</InputLabel>
        <Select
          labelId={'reprocessing-start-stage-label'}
          value={restartStage}
          label={'Start stage'}
          disabled={disabled}
          onChange={(event) => handleRestartStageChange(event.target.value)}
        >
          {REPROCESSING_STAGE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Stack spacing={0.75}>
        <Typography variant={'body2'} sx={{ fontWeight: 600 }}>
          {'Stages to run'}
        </Typography>
        <Typography variant={'caption'} color={'text.secondary'}>
          {'Choose how far the document should continue after the selected start stage.'}
        </Typography>
        <FormGroup>
          {stages.map((stage, index) => (
            <FormControlLabel
              key={stage}
              control={
                <Checkbox
                  checked={selected.has(stage)}
                  disabled={disabled || index === 0}
                  onChange={(event) => handleStageChange(stage, event.target.checked)}
                />
              }
              label={getReprocessingStageLabel(stage)}
            />
          ))}
        </FormGroup>
      </Stack>
    </Stack>
  )
}
