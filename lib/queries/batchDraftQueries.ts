import {
  addDocumentsToReprocessingDraft,
  archiveReprocessingDraft,
  createBatchDraft as createBatchDraftPersistence,
  getOpenDraftDocumentIds,
  getOpenDraftForDocument,
  getReprocessingDraft,
  getReprocessingDrafts,
  removeDocumentsFromReprocessingDrafts,
  removeDocumentFromReprocessingDraft,
  updateReprocessingDraft,
} from './reprocessingDraftQueries'

export const getBatchDrafts = getReprocessingDrafts
export const getBatchDraft = getReprocessingDraft
export const getOpenBatchDraftForDocument = getOpenDraftForDocument
export const getOpenBatchDraftDocumentIds = getOpenDraftDocumentIds
export const createBatchDraft = createBatchDraftPersistence
export const addDocumentsToBatchDraft = addDocumentsToReprocessingDraft
export const updateBatchDraft = updateReprocessingDraft
export const removeDocumentsFromBatchDrafts = removeDocumentsFromReprocessingDrafts
export const removeDocumentFromBatchDraft = removeDocumentFromReprocessingDraft
export const archiveBatchDraft = archiveReprocessingDraft

