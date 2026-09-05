import type { CallbackStageKey, ProcessBatchStatus } from 'types/pipelineContracts'
import type { PipelineConfig } from '@lib/pipelineConfig'
import type { PipelineExecutionCollection } from '@lib/pipelineExecutionContext'

export type PipelineExecutionMode = 'retry' | 'rerun' | 'reprocess'

export interface PipelineExecutionRequest {
  mode: PipelineExecutionMode
  batchId?: string
  documentIds?: string[]
  restartStage: CallbackStageKey
  newBatchName?: string
  draftBatchId?: string
  reason: string
  sourceBatchId?: string
  collection?: PipelineExecutionCollection
  pipelineConfig?: PipelineConfig
}

export interface PipelineExecutionResult {
  ok: true
  batchId: string
  operationId: string
  message: string
}

export interface PipelineExecutionFailure {
  ok: false
  error: string
}

export type PipelineExecutionActionResult = PipelineExecutionResult | PipelineExecutionFailure

export interface PipelineQueueAttemptSummary {
  id: string
  stage: string
  status: string
  queuedAt: string
  completedAt: string | null
  errorType: string | null
  errorMessage: string | null
  operationId: string | null
  executionMode: string | null
}

export interface PipelineExecutionSnapshot {
  batch: ProcessBatchStatus | null
  currentExecution: {
    executionMode: string | null
    operationId: string | null
    idempotencyKey: string | null
    stage: string | null
    reason: string | null
    sourceDocumentIds: string[]
  } | null
  queueAttempts: PipelineQueueAttemptSummary[]
  batchNameConflict: boolean
}
