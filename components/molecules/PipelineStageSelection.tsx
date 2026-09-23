'use client'

import { useState, type ReactElement } from 'react'
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'

import { applyDependencyRule, draftToPipelineConfig, pipelineConfigToDraft, type PipelineConfig } from '@lib/pipelineConfig'
import { NormalizePassCard } from '@molecules/NormalizePassCard'
import type { CallbackStageKey } from 'types/pipelineContracts'

export interface PipelineStageOption {
  value: CallbackStageKey
  label: string
  description: string
}

interface PipelineStageSelectionProps {
  startStage: CallbackStageKey
  requestedStages: readonly CallbackStageKey[]
  pipelineConfig?: PipelineConfig
  stageOptions: readonly PipelineStageOption[]
  getDownstreamStages: (stage: CallbackStageKey) => CallbackStageKey[]
  getDefaultPipelineConfig: (stage: CallbackStageKey) => PipelineConfig
  getRequestedStages: (config: PipelineConfig) => CallbackStageKey[]
  disabled?: boolean
  showNormalizationPasses?: boolean
  onStartStageChange: (stage: CallbackStageKey) => void
  onRequestedStagesChange: (stages: CallbackStageKey[]) => void
  onPipelineConfigChange?: (config: PipelineConfig) => void
}

function isNormalizationStage(stage: CallbackStageKey): boolean {
  return stage === 'document_splitter' || stage === 'page_rotator'
}

function getStageOption(
  stage: CallbackStageKey,
  stageOptions: readonly PipelineStageOption[],
): PipelineStageOption {
  const option = stageOptions.find((item) => item.value === stage)
  if (!option) {
    throw new Error(`No pipeline service option exists for ${stage}`)
  }
  return option
}

export function PipelineStageSelection({
  startStage,
  requestedStages,
  pipelineConfig,
  stageOptions,
  getDownstreamStages,
  getDefaultPipelineConfig,
  getRequestedStages,
  disabled = false,
  showNormalizationPasses = false,
  onStartStageChange,
  onRequestedStagesChange,
  onPipelineConfigChange,
}: PipelineStageSelectionProps): ReactElement {
  const config = pipelineConfig ?? getDefaultPipelineConfig(startStage)
  const draft = pipelineConfigToDraft(config)
  const [advancedOpen, setAdvancedOpen] = useState({ pass1: false, pass2: false })
  const stages = getDownstreamStages(startStage)
  const selected = new Set(requestedStages)

  function applyDraftChange(nextDraft: typeof draft): void {
    const nextConfig = draftToPipelineConfig(applyDependencyRule(nextDraft))
    onPipelineConfigChange?.(nextConfig)
    onRequestedStagesChange(getRequestedStages(nextConfig))
  }

  function handleStartStageChange(stage: CallbackStageKey): void {
    const nextConfig = getDefaultPipelineConfig(stage)
    onStartStageChange(stage)
    onPipelineConfigChange?.(nextConfig)
    onRequestedStagesChange(getRequestedStages(nextConfig))
  }

  function handleStageChange(stage: CallbackStageKey, checked: boolean): void {
    const stageIndex = stages.indexOf(stage)
    if (stageIndex < 0) return

    const nextStages = checked ? stages.slice(0, stageIndex + 1) : stages.slice(0, stageIndex)
    const nextDraft = pipelineConfigToDraft(config)
    nextDraft.steps.normalizePass1 = {
      ...nextDraft.steps.normalizePass1,
      enabled: nextStages.some(isNormalizationStage),
      subSelection: {
        split: nextStages.includes('document_splitter'),
        rotate: nextStages.includes('page_rotator'),
      },
    }
    nextDraft.steps.normalizePass2 = {
      ...nextDraft.steps.normalizePass2,
      enabled: nextStages.includes('page_rotator'),
      subSelection: {
        split: nextStages.includes('document_splitter') && nextStages.includes('page_rotator'),
        rotate: nextStages.includes('page_rotator'),
      },
    }
    nextDraft.steps.ocrProcessor = nextStages.includes('ocr_processor')
    nextDraft.steps.contentDedup = nextStages.includes('content_dedup')
    nextDraft.steps.metadataExtraction = nextStages.includes('metadata_extractor')
    applyDraftChange(nextDraft)
  }

  return (
    <Stack spacing={2}>
      <FormControl fullWidth>
        <InputLabel id={'pipeline-start-stage-label'}>{'Start stage'}</InputLabel>
        <Select
          labelId={'pipeline-start-stage-label'}
          value={startStage}
          label={'Start stage'}
          disabled={disabled}
          onChange={(event) => handleStartStageChange(event.target.value)}
        >
          {stageOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {showNormalizationPasses && stages.some(isNormalizationStage) ? (
        <Stack spacing={1.5}>
          <Typography variant={'body2'} sx={{ fontWeight: 600 }}>
            {'Normalization passes'}
          </Typography>
          <NormalizePassCard
            passNumber={1}
            state={{ ...draft.steps.normalizePass1, advancedOpen: advancedOpen.pass1 }}
            helperText={null}
            disabled={disabled || startStage === 'document_splitter'}
            onToggle={(enabled) =>
              applyDraftChange({
                ...draft,
                steps: {
                  ...draft.steps,
                  normalizePass1: {
                    ...draft.steps.normalizePass1,
                    enabled,
                    subSelection: enabled ? { split: true, rotate: true } : draft.steps.normalizePass1.subSelection,
                  },
                },
              })
            }
            onSubOptionToggle={(subOption, value) =>
              applyDraftChange({
                ...draft,
                steps: {
                  ...draft.steps,
                  normalizePass1: {
                    ...draft.steps.normalizePass1,
                    enabled: true,
                    subSelection: { ...draft.steps.normalizePass1.subSelection, [subOption]: value },
                  },
                },
              })
            }
            onAdvancedToggle={(open) => setAdvancedOpen((current) => ({ ...current, pass1: open }))}
          />
          <NormalizePassCard
            passNumber={2}
            state={{ ...draft.steps.normalizePass2, advancedOpen: advancedOpen.pass2 }}
            helperText={'Requires Normalize Pass 1'}
            disabled={disabled}
            onToggle={(enabled) =>
              applyDraftChange({
                ...draft,
                steps: {
                  ...draft.steps,
                  normalizePass1: {
                    ...draft.steps.normalizePass1,
                    enabled: enabled || draft.steps.normalizePass2.enabled,
                  },
                  normalizePass2: {
                    ...draft.steps.normalizePass2,
                    enabled,
                    subSelection: enabled ? { split: true, rotate: true } : draft.steps.normalizePass2.subSelection,
                  },
                },
              })
            }
            onSubOptionToggle={(subOption, value) =>
              applyDraftChange({
                ...draft,
                steps: {
                  ...draft.steps,
                  normalizePass1: { ...draft.steps.normalizePass1, enabled: true },
                  normalizePass2: {
                    ...draft.steps.normalizePass2,
                    enabled: true,
                    subSelection: { ...draft.steps.normalizePass2.subSelection, [subOption]: value },
                  },
                },
              })
            }
            onAdvancedToggle={(open) => setAdvancedOpen((current) => ({ ...current, pass2: open }))}
          />
        </Stack>
      ) : null}

      <Stack spacing={0.75}>
        <Typography variant={'body2'} sx={{ fontWeight: 600 }}>
          {'Stages to run'}
        </Typography>
        <Typography variant={'caption'} color={'text.secondary'}>
          {'Choose how far the document should continue after the selected start stage.'}
        </Typography>
        <FormGroup>
          {stages.filter((stage) => !isNormalizationStage(stage)).map((stage) => {
            const stageIndex = stages.indexOf(stage)
            const option = getStageOption(stage, stageOptions)
            return (
              <FormControlLabel
                key={stage}
                control={
                  <Checkbox
                    checked={selected.has(stage)}
                    disabled={disabled || stage === startStage || indexIsBeforeSelected(stageIndex, stages, selected)}
                    onChange={(event) => handleStageChange(stage, event.target.checked)}
                  />
                }
                label={
                  <Tooltip title={option.description} arrow enterDelay={400}>
                    <span>{option.label}</span>
                  </Tooltip>
                }
              />
            )
          })}
        </FormGroup>
      </Stack>
    </Stack>
  )
}

function indexIsBeforeSelected(index: number, stages: CallbackStageKey[], selected: Set<CallbackStageKey>): boolean {
  return index > 0 && !selected.has(stages[index - 1])
}
