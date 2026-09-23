import type {
  AddBatchDraftDocumentsInput,
  BatchDraftActionResult,
  BatchDraftDetail,
  BatchDraftDocument,
  BatchDraftMembershipRemovalResult,
  BatchDraftSummary,
  CreateBatchDraftInput,
  UpdateBatchDraftInput,
} from './batchDrafts'

export type ReprocessingDraftSummary = BatchDraftSummary & {
  /** @deprecated Draft actors are recorded in edit_history, not processing_details. */
  createdBy?: string | null
  /** @deprecated Draft actors are recorded in edit_history, not processing_details. */
  updatedBy?: string | null
}

export type ReprocessingDraftDocument = BatchDraftDocument
export type ReprocessingDraftDetail = BatchDraftDetail & {
  /** @deprecated Draft actors are recorded in edit_history, not processing_details. */
  createdBy?: string | null
  /** @deprecated Draft actors are recorded in edit_history, not processing_details. */
  updatedBy?: string | null
}

export interface CreateReprocessingDraftInput extends Omit<CreateBatchDraftInput, 'documentIds' | 'sourceFolderIds'> {
  documentId: string
}

export interface CreateReprocessingDraftForDocumentsInput
  extends Omit<CreateBatchDraftInput, 'documentIds' | 'sourceFolderIds'> {
  documentIds: string[]
}

export interface AddDocumentToReprocessingDraftInput {
  batchId: string
  documentId: string
}

export type AddDocumentsToReprocessingDraftInput = AddBatchDraftDocumentsInput
export type UpdateReprocessingDraftInput = UpdateBatchDraftInput
export type ReprocessingDraftActionResult = BatchDraftActionResult
export type ReprocessingDraftMembershipRemovalResult = BatchDraftMembershipRemovalResult
