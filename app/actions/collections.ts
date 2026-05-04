'use server'

import { revalidatePath } from 'next/cache'
import {
  addDocumentsToCollection,
  getDocumentsForCollection,
  getDocumentsNotInCollection,
  removeDocumentsFromCollection,
} from '@lib/queries'
import type { PaginatedDocumentsResult } from '@lib/types'

interface CollectionDocumentsParams {
  search?: string
  sortField?: 'name' | 'id_legacy' | 'filesize' | 'created_at'
  sortDirection?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export async function getDocumentsForCollectionAction(
  collectionId: string,
  params?: CollectionDocumentsParams,
): Promise<PaginatedDocumentsResult> {
  return getDocumentsForCollection(collectionId, params)
}

export async function getDocumentsNotInCollectionAction(
  collectionId: string,
  params?: CollectionDocumentsParams,
): Promise<PaginatedDocumentsResult> {
  return getDocumentsNotInCollection(collectionId, params)
}

export async function addDocumentsToCollectionAction(collectionId: string, documentIds: string[]): Promise<void> {
  await addDocumentsToCollection(collectionId, documentIds)
  revalidatePath('/collections')
}

export async function removeDocumentsFromCollectionAction(collectionId: string, documentIds: string[]): Promise<void> {
  await removeDocumentsFromCollection(collectionId, documentIds)
  revalidatePath('/collections')
}
