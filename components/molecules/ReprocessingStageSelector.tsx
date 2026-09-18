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
  Typography,
} from '@mui/material'

import {
  getReprocessingDownstreamStages,
  getReprocessingStageLabel,
  pipelineConfigToReprocessingRequestedStages,
  getDefaultReprocessingPipelineConfig,
  REPROCESSING_STAGE_OPTIONS,
} from '@lib/reprocessingDrafts'
import {
  draftToPipelineConfig,
  pipelineConfigToDraft,
  applyDependencyRule,
  type PipelineConfig,
} from '@lib/pipelineConfig'
import { NormalizePassCard } from '@molecules/NormalizePassCard'
import type { CallbackStageKey } from 'types/pipelineContracts'

interface ReprocessingStageSelectorProps {
  restartStage: CallbackStageKey
  requestedStages: readonly CallbackStageKey[]
  pipelineConfig?: PipelineConfig
  disabled?: boolean
  onRestartStageChange: (stage: CallbackStageKey) => void
  onRequestedStagesChange: (stages: CallbackStageKey[]) => void
  onPipelineConfigChange?: (config: PipelineConfig) => void
}

function isNormalizationStage(stage: CallbackStageKey): boolean {
  return stage === 'document_splitter' || stage === 'page_rotator'
}

export function ReprocessingStageSelector({
  restartStage,
  requestedStages,
  pipelineConfig,
  disabled = false,
  onRestartStageChange,
  onRequestedStagesChange,
  onPipelineConfigChange,
}: ReprocessingStageSelectorProps): ReactElement {
  const config = pipelineConfig ?? getDefaultReprocessingPipelineConfig(restartStage)
  const draft = pipelineConfigToDraft(config)
  const [advancedOpen, setAdvancedOpen] = useState({ pass1: false, pass2: false })
  const stages = getReprocessingDownstreamStages(restartStage)
  const selected = new Set(requestedStages)
  const showNormalization = isNormalizationStage(restartStage)

  function applyDraft(nextDraft: typeof draft): void {
    const nextConfig = draftToPipelineConfig(applyDependencyRule(nextDraft))
    onPipelineConfigChange?.(nextConfig)
    onRequestedStagesChange(pipelineConfigToReprocessingRequestedStages(nextConfig))
  }

  function handleRestartStageChange(stage: CallbackStageKey): void {
    const nextConfig = getDefaultReprocessingPipelineConfig(stage)
    onRestartStageChange(stage)
    onPipelineConfigChange?.(nextConfig)
    onRequestedStagesChange(pipelineConfigToReprocessingRequestedStages(nextConfig))
  }

  function handleStageChange(stage: CallbackStageKey, checked: boolean): void {
    const stageIndex = stages.indexOf(stage)
    if (stageIndex < 0) return

    const nextStages = checked ? stages.slice(0, stageIndex + 1) : stages.slice(0, stageIndex)
    const nextDraft = pipelineConfigToDraft(config)
    nextDraft.steps.ocrProcessor = nextStages.includes('ocr_processor')
    nextDraft.steps.contentDedup = nextStages.includes('content_dedup')
    nextDraft.steps.metadataExtraction = nextStages.includes('metadata_extractor')
    applyDraft(nextDraft)
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

      {showNormalization ? (
        <Stack spacing={1.5}>
          <Typography variant={'body2'} sx={{ fontWeight: 600 }}>
            {'Normalization passes'}
          </Typography>
          <NormalizePassCard
            passNumber={1}
            state={{ ...draft.steps.normalizePass1, advancedOpen: advancedOpen.pass1 }}
            helperText={null}
            disabled={disabled || restartStage === 'document_splitter'}
            onToggle={(enabled) =>
              applyDraft({
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
              applyDraft({
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
              applyDraft({
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
              applyDraft({
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
            return (
              <FormControlLabel
                key={stage}
                control={
                  <Checkbox
                    checked={selected.has(stage)}
                    disabled={disabled || stage === restartStage || indexIsBeforeSelected(stageIndex, stages, selected)}
                    onChange={(event) => handleStageChange(stage, event.target.checked)}
                  />
                }
                label={getReprocessingStageLabel(stage)}
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
