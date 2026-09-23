'use server'

import { revalidatePath } from 'next/cache'

import { BATCHES_PATH, DOCUMENTS_PATH, PROCESS_DOCUMENTS_PATH, REVIEW_QUEUE_PATH } from '@constants/paths'
import { getDashboardSession } from '@root/auth'
import {
  addDocumentsToBatchDraft,
  archiveBatchDraft,
  createBatchDraft,
  getBatchDraft,
  getBatchDrafts,
  getOpenBatchDraftDocumentIds,
  getOpenBatchDraftForDocument,
  removeDocumentFromBatchDraft,
  removeDocumentsFromBatchDrafts,
  updateBatchDraft,
} from '@lib/queries/batchDraftQueries'
import type {
  AddBatchDraftDocumentsInput,
  BatchDraftActionResult,
  BatchDraftMembershipRemovalResult,
  CreateBatchDraftInput,
  UpdateBatchDraftInput,
} from 'types/batchDrafts'

function revalidateDraftSurfaces(): void {
  revalidatePath(REVIEW_QUEUE_PATH)
  revalidatePath(PROCESS_DOCUMENTS_PATH)
  revalidatePath(BATCHES_PATH)
  revalidatePath(DOCUMENTS_PATH)
}

async function requireAuthenticatedUser(): Promise<string | null> {
  const session = await getDashboardSession()
  return session?.user?.email?.trim() || null
}

export async function getBatchDraftsAction() {
  if (!(await requireAuthenticatedUser())) return []
  return getBatchDrafts()
}

export async function getBatchDraftAction(batchId: string) {
  if (!(await requireAuthenticatedUser())) return null
  return getBatchDraft(batchId.trim())
}

export async function getOpenBatchDraftForDocumentAction(documentId: string) {
  if (!(await requireAuthenticatedUser())) return null
  return getOpenBatchDraftForDocument(documentId.trim())
}

export async function getOpenBatchDraftDocumentIdsAction(documentIds: readonly string[]): Promise<string[]> {
  if (!(await requireAuthenticatedUser())) return []
  return getOpenBatchDraftDocumentIds(documentIds.map((documentId) => documentId.trim()))
}

export async function createBatchDraftAction(input: CreateBatchDraftInput): Promise<BatchDraftActionResult> {
  const email = await requireAuthenticatedUser()
  if (!email) return { ok: false, error: 'Authentication required.' }
  try {
    const result = await createBatchDraft({
      ...input,
      sourceFolderIds: input.sourceFolderIds?.map((sourceFolderId) => sourceFolderId.trim()),
      documentIds: input.documentIds?.map((documentId) => documentId.trim()),
      name: input.name.trim(),
      reason: input.reason.trim(),
      collectionName: input.collectionName?.trim(),
      collectionNotes: input.collectionNotes?.trim(),
      createdBy: email,
    })
    if (result.ok) revalidateDraftSurfaces()
    return result
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'The batch draft could not be created.' }
  }
}

export async function addDocumentsToBatchDraftAction(
  input: AddBatchDraftDocumentsInput,
): Promise<BatchDraftActionResult> {
  if (!(await requireAuthenticatedUser())) return { ok: false, error: 'Authentication required.' }
  try {
    const result = await addDocumentsToBatchDraft({
      batchId: input.batchId.trim(),
      documentIds: input.documentIds.map((documentId) => documentId.trim()),
    })
    if (result.ok) revalidateDraftSurfaces()
    return result
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'The documents could not be added to the draft.' }
  }
}

export async function updateBatchDraftAction(input: UpdateBatchDraftInput): Promise<BatchDraftActionResult> {
  const email = await requireAuthenticatedUser()
  if (!email) return { ok: false, error: 'Authentication required.' }
  try {
    const result = await updateBatchDraft({
      ...input,
      batchId: input.batchId.trim(),
      sourceFolderIds: input.sourceFolderIds?.map((sourceFolderId) => sourceFolderId.trim()),
      sourceDocumentIds: input.sourceDocumentIds?.map((documentId) => documentId.trim()),
      name: input.name.trim(),
      reason: input.reason.trim(),
      collectionName: input.collectionName?.trim(),
      collectionNotes: input.collectionNotes?.trim(),
      updatedBy: email,
    })
    if (result.ok) revalidateDraftSurfaces()
    return result
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'The batch draft could not be updated.' }
  }
}

export async function removeDocumentFromBatchDraftAction(
  batchId: string,
  documentId: string,
): Promise<BatchDraftActionResult> {
  if (!(await requireAuthenticatedUser())) return { ok: false, error: 'Authentication required.' }
  try {
    const result = await removeDocumentFromBatchDraft(batchId.trim(), documentId.trim())
    if (result.ok) revalidateDraftSurfaces()
    return result
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'The document could not be removed from the draft.' }
  }
}

export async function removeDocumentsFromBatchDraftsAction(
  documentIds: readonly string[],
): Promise<BatchDraftMembershipRemovalResult> {
  if (!(await requireAuthenticatedUser())) return { ok: false, error: 'Authentication required.' }
  const result = await removeDocumentsFromBatchDrafts(documentIds.map((documentId) => documentId.trim()))
  if (result.ok) revalidateDraftSurfaces()
  return result
}

export async function archiveBatchDraftAction(batchId: string): Promise<BatchDraftActionResult> {
  if (!(await requireAuthenticatedUser())) return { ok: false, error: 'Authentication required.' }
  try {
    const result = await archiveBatchDraft(batchId.trim())
    if (result.ok) revalidateDraftSurfaces()
    return result
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'The batch draft could not be archived.' }
  }
}
