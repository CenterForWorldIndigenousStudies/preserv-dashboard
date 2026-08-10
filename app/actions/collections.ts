'use server'

import { revalidatePath } from 'next/cache'
import { COLLECTIONS_PATH } from '@constants/paths'
import {
  addDocumentsToCollection,
  createCollection,
  deleteCollectionWithOptions,
  getDocumentsForCollection,
  getDocumentsNotInCollection,
  removeDocumentsFromCollection,
  type CollectionDocumentQueryParams,
} from '@lib/queries/queries'
import type { PaginatedDocumentsResult } from 'types/pagination'

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

export async function createCollectionAction(input: { tagId: string; collectionNotes?: string }): Promise<void> {
  await createCollection({
    tagId: input.tagId,
    collectionNotes: input.collectionNotes,
  })
  revalidatePath(COLLECTIONS_PATH)
}

export async function createCollectionWithNewTagAction(input: {
  tagName: string
  tagNotes?: string
  collectionNotes?: string
}): Promise<void> {
  await createCollection({
    tagName: input.tagName,
    tagNotes: input.tagNotes,
    collectionNotes: input.collectionNotes,
  })
  revalidatePath(COLLECTIONS_PATH)
}

export async function deleteCollectionAction(
  collectionId: string,
  options?: { deleteTagFromSystem?: boolean },
): Promise<void> {
  await deleteCollectionWithOptions(collectionId, options)
  revalidatePath(COLLECTIONS_PATH)
}

export async function removeDocumentsFromCollectionAction(collectionId: string, documentIds: string[]): Promise<void> {
  await removeDocumentsFromCollection(collectionId, documentIds)
  revalidatePath(COLLECTIONS_PATH)
}
