'use client'

import { type ReactElement, useCallback } from 'react'
import { Box, Checkbox, FormControlLabel, Paper, Stack, Typography } from '@mui/material'

import {
  CONTENT_DEDUP_SERVICE,
  DATA_INGESTER_SERVICE,
  METADATA_EXTRACTOR_SERVICE,
  OCR_PROCESSOR_SERVICE,
} from '@constants/pipeline'
import { getPipelineServiceContractForService } from '@constants/pipelineServices'
import { getPass1HelperText, type PipelineSelectionDraft } from '@lib/pipelineConfig'
import { NormalizePassCard } from '@molecules/NormalizePassCard'

interface PipelineStepSelectorProps {
  draft: PipelineSelectionDraft
  mode: 'preset' | 'custom'
  onDraftChange: (draft: PipelineSelectionDraft) => void
}

interface StepRowProps {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

function StepRow({ label, description, checked, disabled = false, onChange }: StepRowProps): ReactElement {
  const handleChange = useCallback(
    (_event: unknown, value: boolean) => {
      onChange(value)
    },
    [onChange],
  )

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: checked ? 'action.selected' : 'background.default',
        border: '1px solid',
        borderColor: checked ? 'primary.main' : 'transparent',
        opacity: disabled && !checked ? 0.6 : 1,
      }}
    >
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            slotProps={{ input: { 'aria-label': label } }}
            size={'small'}
          />
        }
        label={
          <Box>
            <Typography variant={'body1'} sx={{ fontWeight: 600 }}>
              {label}
            </Typography>
            <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
              {description}
            </Typography>
          </Box>
        }
        sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
      />
    </Paper>
  )
}

export function PipelineStepSelector({ draft, mode, onDraftChange }: PipelineStepSelectorProps): ReactElement {
  const isCustomMode = mode === 'custom'
  const pass1HelperText = getPass1HelperText(draft)
  const ingesterService = getPipelineServiceContractForService(DATA_INGESTER_SERVICE)
  const ocrService = getPipelineServiceContractForService(OCR_PROCESSOR_SERVICE)
  const contentDedupService = getPipelineServiceContractForService(CONTENT_DEDUP_SERVICE)
  const metadataExtractionService = getPipelineServiceContractForService(METADATA_EXTRACTOR_SERVICE)

  const handlePass1Toggle = useCallback(
    (enabled: boolean) => {
      onDraftChange({
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
    },
    [draft, onDraftChange],
  )

  const handlePass2Toggle = useCallback(
    (enabled: boolean) => {
      const newDraft = {
        ...draft,
        steps: {
          ...draft.steps,
          normalizePass2: {
            ...draft.steps.normalizePass2,
            enabled,
            subSelection: enabled ? { split: true, rotate: true } : draft.steps.normalizePass2.subSelection,
          },
        },
      }

      const applied = newDraft.steps.normalizePass2.enabled
        ? {
            ...newDraft,
            steps: {
              ...newDraft.steps,
              normalizePass1: {
                ...newDraft.steps.normalizePass1,
                enabled: true,
              },
            },
          }
        : newDraft
      onDraftChange(applied)
    },
    [draft, onDraftChange],
  )

  const handleSubOptionToggle = useCallback(
    (pass: 1 | 2, subOption: 'split' | 'rotate', value: boolean) => {
      const passState = pass === 1 ? draft.steps.normalizePass1 : draft.steps.normalizePass2
      const newSubSelection = {
        ...passState.subSelection,
        [subOption]: value,
      }

      if (value) {
        const passKey = pass === 1 ? 'normalizePass1' : 'normalizePass2'
        const newDraft = {
          ...draft,
          steps: {
            ...draft.steps,
            [passKey]: {
              ...passState,
              enabled: true,
              subSelection: newSubSelection,
            },
          },
        }
        if (pass === 2) {
          newDraft.steps.normalizePass1 = {
            ...newDraft.steps.normalizePass1,
            enabled: true,
          }
        }
        onDraftChange(newDraft)
        return
      }

      const passKey = pass === 1 ? 'normalizePass1' : 'normalizePass2'
      onDraftChange({
        ...draft,
        steps: {
          ...draft.steps,
          [passKey]: {
            ...passState,
            subSelection: newSubSelection,
          },
        },
      })
    },
    [draft, onDraftChange],
  )

  const handleAdvancedToggle = useCallback(
    (pass: 1 | 2, open: boolean) => {
      const passState = pass === 1 ? draft.steps.normalizePass1 : draft.steps.normalizePass2
      const passKey = pass === 1 ? 'normalizePass1' : 'normalizePass2'
      onDraftChange({
        ...draft,
        steps: {
          ...draft.steps,
          [passKey]: {
            ...passState,
            advancedOpen: open,
          },
        },
      })
    },
    [draft, onDraftChange],
  )

  const handleSimpleStepToggle = useCallback(
    (
      stepKey: 'ocrProcessor' | 'contentDedup' | 'metadataExtraction',
      value: boolean,
    ) => {
      onDraftChange({
        ...draft,
        steps: {
          ...draft.steps,
          [stepKey]: value,
        },
      })
    },
    [draft, onDraftChange],
  )

  const handleMetadataExtractionModeToggle = useCallback(
    (enabled: boolean) => {
      onDraftChange({
        ...draft,
        metadataExtraction: {
          mode: enabled ? 'openai_batch' : 'direct',
        },
      })
    },
    [draft, onDraftChange],
  )

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
          <Typography variant={'overline'} sx={{ color: 'text.secondary', letterSpacing: '0.16em' }}>
            {'Pipeline Services'}
          </Typography>
          <Typography component={'h3'} variant={'h5'} sx={{ mt: 0.5 }}>
            {'Select processing services'}
          </Typography>
          <Typography variant={'body2'} sx={{ mt: 1, color: 'text.secondary' }}>
            {'Steps run in order. Ingest always runs first.'}
            {isCustomMode
              ? ' Select the steps you want to include.'
              : ' You can fine tune this preset here before converting it to custom.'}
          </Typography>
        </Box>

        <Stack spacing={2}>
          <StepRow
            label={ingesterService.display_name}
            description={ingesterService.description}
            checked={true}
            disabled={true}
            onChange={() => {}}
          />

          <NormalizePassCard
            passNumber={1}
            state={draft.steps.normalizePass1}
            helperText={pass1HelperText}
            onToggle={handlePass1Toggle}
            onSubOptionToggle={(sub, value) => handleSubOptionToggle(1, sub, value)}
            onAdvancedToggle={(open) => handleAdvancedToggle(1, open)}
          />

          <NormalizePassCard
            passNumber={2}
            state={draft.steps.normalizePass2}
            helperText={null}
            onToggle={handlePass2Toggle}
            onSubOptionToggle={(sub, value) => handleSubOptionToggle(2, sub, value)}
            onAdvancedToggle={(open) => handleAdvancedToggle(2, open)}
          />

          <StepRow
            label={ocrService.display_name}
            description={ocrService.description}
            checked={draft.steps.ocrProcessor}
            onChange={(value) => handleSimpleStepToggle('ocrProcessor', value)}
          />

          <StepRow
            label={contentDedupService.display_name}
            description={contentDedupService.description}
            checked={draft.steps.contentDedup}
            onChange={(value) => handleSimpleStepToggle('contentDedup', value)}
          />

          {draft.steps.metadataExtraction !== undefined && (
            <Stack spacing={1}>
              <StepRow
                label={metadataExtractionService.display_name}
                description={metadataExtractionService.description}
                checked={draft.steps.metadataExtraction}
                onChange={(value) => handleSimpleStepToggle('metadataExtraction', value)}
              />
              {draft.steps.metadataExtraction && (
                <Paper
                  elevation={0}
                  sx={{
                    ml: { xs: 0, sm: 4 },
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'background.default',
                    border: '1px dashed',
                    borderColor: 'divider',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={draft.metadataExtraction.mode === 'openai_batch'}
                        onChange={(_event, value) => handleMetadataExtractionModeToggle(value)}
                        slotProps={{
                          input: {
                            'aria-label': 'Use OpenAI Batch Service for metadata extraction',
                          },
                        }}
                        size={'small'}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant={'body2'} sx={{ fontWeight: 600 }}>
                          {'Use OpenAI Batch Service for metadata extraction'}
                        </Typography>
                        <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
                          {
                            'Submits the first metadata extraction wave to OpenAI Batch. This is separate from the dashboard processing batch.'
                          }
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
                  />
                </Paper>
              )}
            </Stack>
          )}

        </Stack>
      </Stack>
    </Paper>
  )
}
