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
import { getReprocessingDownstreamStages, PIPELINE_EXECUTION_STAGE_ORDER } from '@lib/reprocessingDrafts'
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

const STAGE_LABELS: Record<CallbackStageKey, string> = {
  ingester: 'Data Ingester',
  document_splitter: 'Document Splitter',
  page_rotator: 'Page Rotator',
  ocr_processor: 'OCR Processor',
  content_dedup: 'Content Deduplication',
  metadata_extractor: 'Metadata Extractor',
  fedora_ingester: 'Fedora Ingester',
}

const STAGE_PROPERTIES: Record<CallbackStageKey, keyof ProcessBatchStatus> = {
  ingester: 'ingester',
  document_splitter: 'documentSplitter',
  page_rotator: 'pageRotator',
  ocr_processor: 'ocrProcessor',
  content_dedup: 'contentDedup',
  metadata_extractor: 'metadataExtractor',
  fedora_ingester: 'fedoraIngester',
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
    if (mode === 'reprocess' && stage === 'fedora_ingester') {
      return false
    }
    const service = stage.replace('_', '-') as PipelineConfig['executionPlan'][number]['service']
    if (configuredServices && !configuredServices.has(service)) {
      return false
    }
    const value = batch[STAGE_PROPERTIES[stage]]
    if (!value || typeof value !== 'object' || !('status' in value)) {
      return false
    }
    return mode === 'retry' ? value.status === 'failed' : true
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
    () => (mode === 'rerun' ? draftToPipelineConfig(rerunDraft) : undefined),
    [mode, rerunDraft],
  )
  const stages = useMemo(() => availableStages(batch, mode, rerunPipelineConfig), [batch, mode, rerunPipelineConfig])
  const [stage, setStage] = useState<CallbackStageKey>(initialStage ?? stages[0] ?? 'metadata_extractor')
  const [requestedStages, setRequestedStages] = useState<CallbackStageKey[]>(
    getReprocessingDownstreamStages(initialStage ?? stages[0] ?? 'metadata_extractor'),
  )
  const [reason, setReason] = useState('')
  const [newBatchName, setNewBatchName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'rerun' || !open) {
      return
    }

    setRerunDraft(pipelineConfigToDraft(getPipelineConfigForBatch(batch)))
    setIsPipelineStepsModalOpen(false)
  }, [batch, batch.batchId, mode, open])

  useEffect(() => {
    if (mode !== 'reprocess' || !open) {
      return
    }

    const selectedStage =
      initialStage && stages.includes(initialStage) ? initialStage : (stages[0] ?? 'metadata_extractor')
    setStage(selectedStage)
    setRequestedStages(getReprocessingDownstreamStages(selectedStage))
  }, [batch.batchId, initialStage, mode, open, stages])

  useEffect(() => {
    if (!stages.includes(stage)) {
      const nextStage = stages[0] ?? 'metadata_extractor'
      setStage(nextStage)
      if (mode === 'reprocess') {
        setRequestedStages(getReprocessingDownstreamStages(nextStage))
      }
    }
  }, [mode, stage, stages])

  async function submit(): Promise<void> {
    setSubmitting(true)
    setError(null)
    const request: PipelineExecutionRequest = {
      mode,
      batchId: mode === 'reprocess' ? undefined : batch.batchId,
      documentIds,
      restartStage: stage,
      newBatchName: mode === 'reprocess' ? newBatchName : undefined,
      reason,
      requestedStages: mode === 'reprocess' ? requestedStages : undefined,
      sourceBatchId: batch.batchId || undefined,
      pipelineConfig: rerunPipelineConfig,
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

  const title = mode === 'retry' ? 'Retry Pipeline Stage' : mode === 'rerun' ? 'Rerun Pipeline' : 'Reprocess Documents'
  const description =
    mode === 'retry'
      ? 'This creates a new queue attempt and preserves the failed attempt in history.'
      : mode === 'rerun'
        ? 'This starts the existing unpublished batch again from the selected stage.'
        : 'This creates new document artifacts in a new batch and preserves the existing documents and history.'
  const stageFieldLabel = mode === 'rerun' ? 'Start from stage' : 'Restart stage'

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth={'sm'}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant={'body2'} color={'text.secondary'}>
            {description}
          </Typography>
          {mode === 'rerun' ? (
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
          {mode === 'reprocess' ? (
            <ReprocessingStageSelector
              restartStage={stage}
              requestedStages={requestedStages}
              onRestartStageChange={(nextStage) => {
                setStage(nextStage)
                setRequestedStages(getReprocessingDownstreamStages(nextStage))
              }}
              onRequestedStagesChange={setRequestedStages}
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
                    {STAGE_LABELS[option]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {mode === 'reprocess' ? (
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
