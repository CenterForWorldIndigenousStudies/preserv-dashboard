'use server'

import { revalidatePath } from 'next/cache'
import { COLLECTIONS_PATH } from '@constants/paths'
import {
  addDocumentsToCollection,
  createCollection,
  deleteCollectionWithOptions,
  getCollectionPage,
  getCollectionDeletionPreview,
  getDocumentsForCollection,
  getDocumentsNotInCollection,
  removeDocumentsFromCollection,
  renameCollection,
  updateCollection,
  type CollectionDocumentQueryParams,
  type CollectionDeletionPreview,
  type RenameCollectionInput,
  type UpdateCollectionInput,
} from '@lib/queries/collectionQueries'
import type { CollectionListPageResult, CollectionTableQuery } from 'types/collections'
import type { PaginatedDocumentsResult } from 'types/pagination'

export async function getCollectionsAction(query: CollectionTableQuery): Promise<CollectionListPageResult> {
  return getCollectionPage(query)
}

export async function getDocumentsForCollectionAction(
  collectionId: string,
  params?: CollectionDocumentQueryParams,
): Promise<PaginatedDocumentsResult> {
  return getDocumentsForCollection(collectionId, params)
}

export async function getDocumentsNotInCollectionAction(
  collectionId: string,
  params?: CollectionDocumentQueryParams,
): Promise<PaginatedDocumentsResult> {
  return getDocumentsNotInCollection(collectionId, params)
}

export async function addDocumentsToCollectionAction(collectionId: string, documentIds: string[]): Promise<void> {
  await addDocumentsToCollection(collectionId, documentIds)
  revalidatePath(COLLECTIONS_PATH)
}

export async function createCollectionAction(input: {
  tagId?: string
  tagName?: string
  tagNotes?: string
  qualifierTagIds?: string[]
  qualifierTagNames?: string[]
  collectionNotes?: string
  fedoraNodeId?: string
}): Promise<void> {
  await createCollection(input)
  revalidatePath(COLLECTIONS_PATH)
}

export async function createCollectionWithNewTagAction(input: {
  tagName: string
  tagNotes?: string
  qualifierTagIds?: string[]
  qualifierTagNames?: string[]
  collectionNotes?: string
  fedoraNodeId?: string
}): Promise<void> {
  await createCollection({
    tagName: input.tagName,
    tagNotes: input.tagNotes,
    collectionNotes: input.collectionNotes,
  })
  revalidatePath(COLLECTIONS_PATH)
}

export async function updateCollectionAction(input: UpdateCollectionInput): Promise<void> {
  await updateCollection(input)
  revalidatePath(COLLECTIONS_PATH)
}

export async function renameCollectionAction(input: RenameCollectionInput): Promise<void> {
  await renameCollection(input)
  revalidatePath(COLLECTIONS_PATH)
}

export async function deleteCollectionAction(
  collectionId: string,
  options?: { deleteTagFromSystem?: boolean },
): Promise<void> {
  await deleteCollectionWithOptions(collectionId, options)
  revalidatePath(COLLECTIONS_PATH)
}

export async function getCollectionDeletionPreviewAction(collectionId: string): Promise<CollectionDeletionPreview> {
  return getCollectionDeletionPreview(collectionId)
}

export async function removeDocumentsFromCollectionAction(collectionId: string, documentIds: string[]): Promise<void> {
  await removeDocumentsFromCollection(collectionId, documentIds)
  revalidatePath(COLLECTIONS_PATH)
}
