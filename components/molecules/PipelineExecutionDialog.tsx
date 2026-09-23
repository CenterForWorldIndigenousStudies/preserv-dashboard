'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import { requestPipelineExecution } from '@actions/pipelineExecution'
import { getPipelineConfigForBatch } from '@lib/pipelineExecution'
import {
  FEDORA_INGESTER_SERVICE,
  METADATA_EXTRACTOR_SERVICE,
  getServiceIdForCallbackStage,
} from '@constants/pipeline'
import { GENERATED_PIPELINE_EXECUTION_MODES } from '@constants/generated/pipelineExecutionModes'
import { PIPELINE_STAGE_PROPERTIES } from '@constants/pipelineStageProperties'
import { PIPELINE_STAGE_STATUSES } from '@constants/pipelineStageStatuses'
import { getPipelineServiceDisplayName } from '@constants/pipelineServices'
import {
  getDefaultReprocessingPipelineConfig,
  getReprocessingDownstreamStages,
  pipelineConfigToReprocessingRequestedStages,
  PIPELINE_EXECUTION_STAGE_ORDER,
} from '@lib/reprocessingDrafts'
import {
  createDefaultDraft,
  draftToPipelineConfig,
  expandPresetToDraft,
  pipelineConfigToDraft,
  type PipelineConfig,
  type PipelineSelectionDraft,
} from '@lib/pipelineConfig'
import { PipelineProfileSelector } from '@molecules/PipelineProfileSelector'
import { ReprocessingStageSelector } from '@molecules/ReprocessingStageSelector'
import { PipelineStepsModal } from '@organisms/PipelineStepsModal'
import type { PipelineExecutionMode, PipelineExecutionRequest } from 'types/pipelineExecution'
import type { CallbackStageKey, ProcessBatchStatus } from 'types/pipelineContracts'

interface PipelineExecutionDialogProps {
  batch: ProcessBatchStatus
  mode: PipelineExecutionMode
  open: boolean
  onClose: () => void
  onExecutionQueued?: () => void
  documentIds?: string[]
  initialStage?: CallbackStageKey
}

function availableStages(
  batch: ProcessBatchStatus,
  mode: PipelineExecutionMode,
  pipelineConfig?: PipelineConfig,
): CallbackStageKey[] {
  const configuredServices = pipelineConfig
    ? new Set(pipelineConfig.executionPlan.filter((step) => step.enabled).map((step) => step.service))
    : null

  return PIPELINE_EXECUTION_STAGE_ORDER.filter((stage) => {
    if (mode === GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS && stage === FEDORA_INGESTER_SERVICE) {
      return false
    }
    const service = getServiceIdForCallbackStage(stage)
    if (!service || (configuredServices && !configuredServices.has(service))) {
      return false
    }
    const value = batch[PIPELINE_STAGE_PROPERTIES[stage]]
    if (!value || typeof value !== 'object' || !('status' in value)) {
      return false
    }
    return mode === GENERATED_PIPELINE_EXECUTION_MODES.RETRY
      ? value.status === PIPELINE_STAGE_STATUSES.FAILED
      : true
  })
}

export function PipelineExecutionDialog({
  batch,
  mode,
  open,
  onClose,
  onExecutionQueued,
  documentIds = [],
  initialStage,
}: PipelineExecutionDialogProps): React.ReactElement {
  const [rerunDraft, setRerunDraft] = useState<PipelineSelectionDraft>(createDefaultDraft)
  const [isPipelineStepsModalOpen, setIsPipelineStepsModalOpen] = useState(false)
  const rerunPipelineConfig = useMemo(
    () => (mode === GENERATED_PIPELINE_EXECUTION_MODES.RERUN ? draftToPipelineConfig(rerunDraft) : undefined),
    [mode, rerunDraft],
  )
  const stages = useMemo(() => availableStages(batch, mode, rerunPipelineConfig), [batch, mode, rerunPipelineConfig])
  const [stage, setStage] = useState<CallbackStageKey>(initialStage ?? stages[0] ?? METADATA_EXTRACTOR_SERVICE)
  const [requestedStages, setRequestedStages] = useState<CallbackStageKey[]>(
    getReprocessingDownstreamStages(initialStage ?? stages[0] ?? METADATA_EXTRACTOR_SERVICE),
  )
  const [reprocessPipelineConfig, setReprocessPipelineConfig] = useState<PipelineConfig>(() =>
    getDefaultReprocessingPipelineConfig(initialStage ?? stages[0] ?? METADATA_EXTRACTOR_SERVICE),
  )
  const [reason, setReason] = useState('')
  const [newBatchName, setNewBatchName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== GENERATED_PIPELINE_EXECUTION_MODES.RERUN || !open) {
      return
    }

    setRerunDraft(pipelineConfigToDraft(getPipelineConfigForBatch(batch)))
    setIsPipelineStepsModalOpen(false)
  }, [batch, batch.batchId, mode, open])

  useEffect(() => {
    if (mode !== GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS || !open) {
      return
    }

    const selectedStage =
      initialStage && stages.includes(initialStage) ? initialStage : (stages[0] ?? METADATA_EXTRACTOR_SERVICE)
    setStage(selectedStage)
    const defaultConfig = getDefaultReprocessingPipelineConfig(selectedStage)
    setReprocessPipelineConfig(defaultConfig)
    setRequestedStages(pipelineConfigToReprocessingRequestedStages(defaultConfig))
  }, [batch.batchId, initialStage, mode, open, stages])

  useEffect(() => {
    if (!stages.includes(stage)) {
      const nextStage = stages[0] ?? METADATA_EXTRACTOR_SERVICE
      setStage(nextStage)
      if (mode === GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS) {
        const defaultConfig = getDefaultReprocessingPipelineConfig(nextStage)
        setReprocessPipelineConfig(defaultConfig)
        setRequestedStages(pipelineConfigToReprocessingRequestedStages(defaultConfig))
      }
    }
  }, [mode, stage, stages])

  async function submit(): Promise<void> {
    setSubmitting(true)
    setError(null)
    const request: PipelineExecutionRequest = {
      mode,
      batchId: mode === GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS ? undefined : batch.batchId,
      documentIds,
      restartStage: stage,
      newBatchName: mode === GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS ? newBatchName : undefined,
      reason,
      requestedStages: mode === GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS ? requestedStages : undefined,
      sourceBatchId: batch.batchId || undefined,
      pipelineConfig: mode === GENERATED_PIPELINE_EXECUTION_MODES.RERUN ? rerunPipelineConfig : reprocessPipelineConfig,
    }
    const result = await requestPipelineExecution(request)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onExecutionQueued?.()
    onClose()
  }

  const title =
    mode === GENERATED_PIPELINE_EXECUTION_MODES.RETRY
      ? 'Retry Pipeline Stage'
      : mode === GENERATED_PIPELINE_EXECUTION_MODES.RERUN
        ? 'Rerun Pipeline'
        : 'Reprocess Documents'
  const description =
    mode === GENERATED_PIPELINE_EXECUTION_MODES.RETRY
      ? 'This creates a new queue attempt and preserves the failed attempt in history.'
      : mode === GENERATED_PIPELINE_EXECUTION_MODES.RERUN
        ? 'This starts the existing unpublished batch again from the selected stage.'
        : 'This creates new document artifacts in a new batch and preserves the existing documents and history.'
  const stageFieldLabel = mode === GENERATED_PIPELINE_EXECUTION_MODES.RERUN ? 'Start from stage' : 'Restart stage'

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth={'sm'}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant={'body2'} color={'text.secondary'}>
            {description}
          </Typography>
          {mode === GENERATED_PIPELINE_EXECUTION_MODES.RERUN ? (
            <>
              <PipelineProfileSelector
                draft={rerunDraft}
                onProfileChange={(profileId) => setRerunDraft(expandPresetToDraft(profileId))}
                onConvertToCustom={() =>
                  setRerunDraft((current) => ({ ...current, profileId: 'custom', mode: 'custom' }))
                }
                onOpenStepsModal={() => setIsPipelineStepsModalOpen(true)}
              />
              <PipelineStepsModal
                open={isPipelineStepsModalOpen}
                draft={rerunDraft}
                onClose={() => setIsPipelineStepsModalOpen(false)}
                onDraftChange={setRerunDraft}
              />
            </>
          ) : null}
          {mode === GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS ? (
            <ReprocessingStageSelector
              restartStage={stage}
              requestedStages={requestedStages}
              onRestartStageChange={(nextStage) => {
                setStage(nextStage)
                const defaultConfig = getDefaultReprocessingPipelineConfig(nextStage)
                setReprocessPipelineConfig(defaultConfig)
                setRequestedStages(pipelineConfigToReprocessingRequestedStages(defaultConfig))
              }}
              onRequestedStagesChange={setRequestedStages}
              pipelineConfig={reprocessPipelineConfig}
              onPipelineConfigChange={(config) => {
                setReprocessPipelineConfig(config)
                setRequestedStages(pipelineConfigToReprocessingRequestedStages(config))
              }}
            />
          ) : (
            <FormControl fullWidth>
              <InputLabel id={'pipeline-execution-stage-label'}>{stageFieldLabel}</InputLabel>
              <Select
                labelId={'pipeline-execution-stage-label'}
                value={stage}
                label={stageFieldLabel}
                onChange={(event) => setStage(event.target.value)}
              >
                {stages.map((option) => (
                  <MenuItem key={option} value={option}>
                    {getPipelineServiceDisplayName(getServiceIdForCallbackStage(option) ?? option)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {mode === GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS ? (
            <TextField
              label={'New batch name'}
              value={newBatchName}
              onChange={(event) => setNewBatchName(event.target.value)}
              helperText={'The name must be unique.'}
              required
              fullWidth
            />
          ) : null}
          <TextField
            label={'Reason'}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            helperText={'This is recorded with the operation.'}
            required
            multiline
            minRows={2}
            fullWidth
          />
          {error ? <Alert severity={'error'}>{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {'Cancel'}
        </Button>
        <Button
          onClick={() => void submit()}
          variant={'contained'}
          disabled={submitting || !reason.trim() || stages.length === 0}
        >
          {submitting ? 'Queuing…' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
