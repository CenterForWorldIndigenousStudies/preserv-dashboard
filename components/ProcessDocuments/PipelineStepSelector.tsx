'use client'

import { type ReactElement, useCallback } from 'react'
import {
  Box,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material'

import {
  getPass1HelperText,
  type PipelineSelectionDraft,
} from '@lib/pipelineConfig'
import { NormalizePassCard } from './NormalizePassCard'

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

function StepRow({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: StepRowProps): ReactElement {
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
        bgcolor: checked ? 'rgba(53, 88, 52, 0.04)' : 'background.default',
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
            size="small"
          />
        }
        label={
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {label}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {description}
            </Typography>
          </Box>
        }
        sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
      />
    </Paper>
  )
}

export function PipelineStepSelector({
  draft,
  mode,
  onDraftChange,
}: PipelineStepSelectorProps): ReactElement {
  const isCustomMode = mode === 'custom'
  const pass1HelperText = getPass1HelperText(draft)

  const handlePass1Toggle = useCallback(
    (enabled: boolean) => {
      onDraftChange({
        ...draft,
        steps: {
          ...draft.steps,
          normalizePass1: {
            ...draft.steps.normalizePass1,
            enabled,
            subSelection: enabled
              ? { split: true, rotate: true }
              : draft.steps.normalizePass1.subSelection,
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
            subSelection: enabled
              ? { split: true, rotate: true }
              : draft.steps.normalizePass2.subSelection,
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
      const passState =
        pass === 1 ? draft.steps.normalizePass1 : draft.steps.normalizePass2
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
      const passState =
        pass === 1 ? draft.steps.normalizePass1 : draft.steps.normalizePass2
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
      stepKey:
        | 'ocrProcessor'
        | 'contentDedup'
        | 'metadataExtraction'
        | 'metadataValidation'
        | 'rightsDeterminator'
        | 'fedoraIngester',
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
          <Typography
            variant="overline"
            sx={{ color: 'text.secondary', letterSpacing: '0.16em' }}
          >
            Pipeline Steps
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.5 }}>
            Select processing steps
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            Steps run in order. Ingest always runs first.
            {isCustomMode
              ? ' Select the steps you want to include.'
              : ' You can fine tune this preset here before converting it to custom.'}
          </Typography>
        </Box>

        <Stack spacing={2}>
          <StepRow
            label="Ingest"
            description="Ingest documents from Google Drive source folders"
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
            label="OCR Processor"
            description="Run OCR on normalized documents"
            checked={draft.steps.ocrProcessor}
            onChange={(value) => handleSimpleStepToggle('ocrProcessor', value)}
          />

          <StepRow
            label="Content Dedup"
            description="Detect and handle duplicate content across documents"
            checked={draft.steps.contentDedup}
            onChange={(value) => handleSimpleStepToggle('contentDedup', value)}
          />

          {draft.steps.metadataExtraction !== undefined && (
            <StepRow
              label="Metadata Extraction"
              description="Extract metadata from documents (future)"
              checked={draft.steps.metadataExtraction}
              onChange={(value) => handleSimpleStepToggle('metadataExtraction', value)}
            />
          )}

          {draft.steps.metadataValidation !== undefined && (
            <StepRow
              label="Metadata Validation"
              description="Validate extracted metadata (future)"
              checked={draft.steps.metadataValidation}
              onChange={(value) => handleSimpleStepToggle('metadataValidation', value)}
            />
          )}

          {draft.steps.rightsDeterminator !== undefined && (
            <StepRow
              label="Rights Determinator"
              description="Determine rights and permissions (future)"
              checked={draft.steps.rightsDeterminator}
              onChange={(value) => handleSimpleStepToggle('rightsDeterminator', value)}
            />
          )}

          {draft.steps.fedoraIngester !== undefined && (
            <StepRow
              label="Fedora Ingester"
              description="Ingest into Fedora digital repository (future)"
              checked={draft.steps.fedoraIngester}
              onChange={(value) => handleSimpleStepToggle('fedoraIngester', value)}
            />
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}
