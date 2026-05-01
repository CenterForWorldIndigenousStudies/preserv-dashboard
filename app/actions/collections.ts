'use server'

import { revalidatePath } from 'next/cache'
import {
  addDocumentsToCollection,
  getDocumentsForCollection,
  getDocumentsNotInCollection,
  removeDocumentsFromCollection,
} from '@lib/queries'
import type { Document } from '@lib/types'

export async function getDocumentsForCollectionAction(collectionId: string): Promise<Document[]> {
  return getDocumentsForCollection(collectionId)
}

export async function getDocumentsNotInCollectionAction(collectionId: string): Promise<Document[]> {
  return getDocumentsNotInCollection(collectionId)
}

export async function addDocumentsToCollectionAction(collectionId: string, documentIds: string[]): Promise<void> {
  await addDocumentsToCollection(collectionId, documentIds)
  revalidatePath('/collections')
}

export async function removeDocumentsFromCollectionAction(collectionId: string, documentIds: string[]): Promise<void> {
  await removeDocumentsFromCollection(collectionId, documentIds)
  revalidatePath('/collections')
}
