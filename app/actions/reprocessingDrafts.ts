'use server'

import { revalidatePath } from 'next/cache'

import { BATCHES_PATH, PROCESS_DOCUMENTS_PATH, REVIEW_QUEUE_PATH } from '@constants/paths'
import { getDashboardSession } from '@root/auth'
import {
  addDocumentToReprocessingDraft,
  addDocumentsToReprocessingDraft,
  archiveReprocessingDraft,
  createReprocessingDraft,
  createReprocessingDraftForDocuments,
  getOpenDraftDocumentIds,
  getOpenDraftForDocument,
  getReprocessingDraft,
  getReprocessingDrafts,
  removeDocumentsFromReprocessingDrafts,
  removeDocumentFromReprocessingDraft,
  updateReprocessingDraft,
} from '@lib/queries/reprocessingDraftQueries'
import type {
  AddDocumentToReprocessingDraftInput,
  AddDocumentsToReprocessingDraftInput,
  CreateReprocessingDraftInput,
  CreateReprocessingDraftForDocumentsInput,
  ReprocessingDraftActionResult,
  ReprocessingDraftMembershipRemovalResult,
  UpdateReprocessingDraftInput,
} from 'types/reprocessingDrafts'

function revalidateDraftSurfaces(): void {
  revalidatePath(REVIEW_QUEUE_PATH)
  revalidatePath(PROCESS_DOCUMENTS_PATH)
  revalidatePath(BATCHES_PATH)
}

async function requireAuthenticatedUser(): Promise<string | null> {
  const session = await getDashboardSession()
  return session?.user?.email?.trim() || null
}

export async function getReprocessingDraftsAction() {
  if (!(await requireAuthenticatedUser())) return []
  return getReprocessingDrafts()
}

export async function getReprocessingDraftAction(batchId: string) {
  if (!(await requireAuthenticatedUser())) return null
  return getReprocessingDraft(batchId.trim())
}

export async function getOpenDraftForDocumentAction(documentId: string) {
  if (!(await requireAuthenticatedUser())) return null
  return getOpenDraftForDocument(documentId.trim())
}

export async function getOpenDraftDocumentIdsAction(documentIds: readonly string[]): Promise<string[]> {
  if (!(await requireAuthenticatedUser())) return []
  return getOpenDraftDocumentIds(documentIds.map((documentId) => documentId.trim()))
}

export async function removeDocumentsFromReprocessingDraftsAction(
  documentIds: readonly string[],
): Promise<ReprocessingDraftMembershipRemovalResult> {
  if (!(await requireAuthenticatedUser())) return { ok: false, error: 'Authentication required.' }
  try {
    const result = await removeDocumentsFromReprocessingDrafts(documentIds.map((documentId) => documentId.trim()))
    if (result.ok) revalidateDraftSurfaces()
    return result
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The documents could not be removed from reprocessing drafts.',
    }
  }
}

export async function createReprocessingDraftAction(
  input: CreateReprocessingDraftInput,
): Promise<ReprocessingDraftActionResult> {
  const email = await requireAuthenticatedUser()
  if (!email) return { ok: false, error: 'Authentication required.' }
  try {
    const result = await createReprocessingDraft({
      ...input,
      documentId: input.documentId.trim(),
      name: input.name.trim(),
      reason: input.reason.trim(),
      collectionName: input.collectionName?.trim(),
      collectionNotes: input.collectionNotes?.trim(),
      createdBy: email,
    })
    if (result.ok) revalidateDraftSurfaces()
    return result
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'The reprocessing draft could not be created.' }
  }
}

export async function createReprocessingDraftForDocumentsAction(
  input: CreateReprocessingDraftForDocumentsInput,
): Promise<ReprocessingDraftActionResult> {
  const email = await requireAuthenticatedUser()
  if (!email) return { ok: false, error: 'Authentication required.' }
  try {
    const result = await createReprocessingDraftForDocuments({
      ...input,
      documentIds: input.documentIds.map((documentId) => documentId.trim()),
      name: input.name.trim(),
      reason: input.reason.trim(),
      collectionName: input.collectionName?.trim(),
      collectionNotes: input.collectionNotes?.trim(),
      createdBy: email,
    })
    if (result.ok) revalidateDraftSurfaces()
    return result
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'The reprocessing draft could not be created.' }
  }
}

export async function addDocumentToReprocessingDraftAction(
  input: AddDocumentToReprocessingDraftInput,
): Promise<ReprocessingDraftActionResult> {
  if (!(await requireAuthenticatedUser())) return { ok: false, error: 'Authentication required.' }
  try {
    const result = await addDocumentToReprocessingDraft({
      batchId: input.batchId.trim(),
      documentId: input.documentId.trim(),
    })
    if (result.ok) revalidateDraftSurfaces()
    return result
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The document could not be added to the draft.',
    }
  }
}

export async function addDocumentsToReprocessingDraftAction(
  input: AddDocumentsToReprocessingDraftInput,
): Promise<ReprocessingDraftActionResult> {
  if (!(await requireAuthenticatedUser())) return { ok: false, error: 'Authentication required.' }
  try {
    const result = await addDocumentsToReprocessingDraft({
      batchId: input.batchId.trim(),
      documentIds: input.documentIds.map((documentId) => documentId.trim()),
    })
    if (result.ok) revalidateDraftSurfaces()
    return result
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The documents could not be added to the draft.',
    }
  }
}

export async function updateReprocessingDraftAction(
  input: UpdateReprocessingDraftInput,
): Promise<ReprocessingDraftActionResult> {
  const email = await requireAuthenticatedUser()
  if (!email) return { ok: false, error: 'Authentication required.' }
  try {
    const result = await updateReprocessingDraft({
      ...input,
      batchId: input.batchId.trim(),
      name: input.name.trim(),
      reason: input.reason.trim(),
      collectionName: input.collectionName?.trim(),
      collectionNotes: input.collectionNotes?.trim(),
      updatedBy: email,
    })
    if (result.ok) revalidateDraftSurfaces()
    return result
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : 'The reprocessing draft could not be updated.' }
  }
}

export async function removeDocumentFromReprocessingDraftAction(
  batchId: string,
  documentId: string,
): Promise<ReprocessingDraftActionResult> {
  if (!(await requireAuthenticatedUser())) return { ok: false, error: 'Authentication required.' }
  try {
    const result = await removeDocumentFromReprocessingDraft(batchId.trim(), documentId.trim())
    if (result.ok) revalidateDraftSurfaces()
    return result
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The document could not be removed from the draft.',
    }
  }
}

export async function archiveReprocessingDraftAction(batchId: string): Promise<ReprocessingDraftActionResult> {
  if (!(await requireAuthenticatedUser())) return { ok: false, error: 'Authentication required.' }
  try {
    const result = await archiveReprocessingDraft(batchId.trim())
    if (result.ok) revalidateDraftSurfaces()
    return result
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The reprocessing draft could not be archived.',
    }
  }
}
