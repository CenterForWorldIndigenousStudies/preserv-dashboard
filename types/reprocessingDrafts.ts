import type { CallbackStageKey } from 'types/pipelineContracts'

export interface ReprocessingDraftSummary {
  id: string
  name: string
  collectionName: string | null
  collectionNotes: string | null
  restartStage: CallbackStageKey
  reason: string
  documentCount: number
  createdAt: string | null
  updatedAt: string | null
  createdBy: string | null
  updatedBy: string | null
}

export interface ReprocessingDraftDocument {
  id: string
  name: string | null
  idLegacy: string | null
  sourceBatchName: string | null
  addedAt: string | null
}

export interface ReprocessingDraftDetail extends ReprocessingDraftSummary {
  documents: ReprocessingDraftDocument[]
}

export interface CreateReprocessingDraftInput {
  documentId: string
  name: string
  collectionName?: string
  collectionNotes?: string
  restartStage: CallbackStageKey
  reason: string
  createdBy?: string | null
}

export interface CreateReprocessingDraftForDocumentsInput {
  documentIds: string[]
  name: string
  collectionName?: string
  collectionNotes?: string
  restartStage: CallbackStageKey
  reason: string
  createdBy?: string | null
}

export interface AddDocumentToReprocessingDraftInput {
  batchId: string
  documentId: string
}

export interface AddDocumentsToReprocessingDraftInput {
  batchId: string
  documentIds: string[]
}

export interface UpdateReprocessingDraftInput {
  batchId: string
  name: string
  collectionName?: string
  collectionNotes?: string
  reason: string
  updatedBy?: string | null
}

export interface ReprocessingDraftSuccess {
  ok: true
  batchId: string
}

export interface ReprocessingDraftFailure {
  ok: false
  error: string
}

export type ReprocessingDraftActionResult = ReprocessingDraftSuccess | ReprocessingDraftFailure

export interface ReprocessingDraftMembershipRemovalSuccess {
  ok: true
  removedDocumentIds: string[]
}

export interface ReprocessingDraftMembershipRemovalFailure {
  ok: false
  error: string
}

export type ReprocessingDraftMembershipRemovalResult =
  | ReprocessingDraftMembershipRemovalSuccess
  | ReprocessingDraftMembershipRemovalFailure
