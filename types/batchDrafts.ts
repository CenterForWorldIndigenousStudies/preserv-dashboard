import type { CallbackStageKey } from 'types/pipelineContracts'
import type { PipelineConfig } from '@lib/pipelineConfig'
import { GENERATED_PIPELINE_EXECUTION_MODES } from '@constants/generated/pipelineExecutionModes'

export type BatchDraftExecutionMode =
  | typeof GENERATED_PIPELINE_EXECUTION_MODES.NORMAL
  | typeof GENERATED_PIPELINE_EXECUTION_MODES.REPROCESS

export interface BatchDraftSummary {
  id: string
  name: string
  collectionName: string | null
  collectionNotes: string | null
  restartStage: CallbackStageKey
  requestedStages: readonly CallbackStageKey[]
  pipelineConfig?: PipelineConfig
  executionMode?: BatchDraftExecutionMode
  reason: string
  sourceFolderIds?: readonly string[]
  sourceDocumentIds?: readonly string[]
  documentCount: number
  createdAt: string | null
  updatedAt: string | null
  /** @deprecated Actors are recorded in edit_history rather than processing_details. */
  createdBy?: string | null
  /** @deprecated Actors are recorded in edit_history rather than processing_details. */
  updatedBy?: string | null
}

export interface BatchDraftDocument {
  id: string
  name: string | null
  idLegacy: string | null
  sourceBatchId: string | null
  sourceBatchLegacyId: string | null
  sourceBatchName: string | null
  addedAt: string | null
}

export interface BatchDraftDetail extends BatchDraftSummary {
  documents: BatchDraftDocument[]
}

export interface CreateBatchDraftInput {
  documentIds?: readonly string[]
  sourceFolderIds?: readonly string[]
  name: string
  collectionName?: string
  collectionNotes?: string
  restartStage: CallbackStageKey
  requestedStages: readonly CallbackStageKey[]
  executionMode?: BatchDraftExecutionMode
  pipelineConfig?: PipelineConfig
  reason: string
  createdBy?: string | null
}

export interface UpdateBatchDraftInput {
  batchId: string
  sourceFolderIds?: readonly string[]
  sourceDocumentIds?: readonly string[]
  name: string
  collectionName?: string
  collectionNotes?: string
  restartStage: CallbackStageKey
  requestedStages: readonly CallbackStageKey[]
  executionMode?: BatchDraftExecutionMode
  pipelineConfig?: PipelineConfig
  reason: string
  updatedBy?: string | null
}

export interface AddBatchDraftDocumentsInput {
  batchId: string
  documentIds: readonly string[]
}

export interface BatchDraftSuccess {
  ok: true
  batchId: string
}

export interface BatchDraftFailure {
  ok: false
  error: string
}

export type BatchDraftActionResult = BatchDraftSuccess | BatchDraftFailure

export interface BatchDraftMembershipRemovalSuccess {
  ok: true
  removedDocumentIds: string[]
}

export interface BatchDraftMembershipRemovalFailure {
  ok: false
  error: string
}

export type BatchDraftMembershipRemovalResult =
  | BatchDraftMembershipRemovalSuccess
  | BatchDraftMembershipRemovalFailure
