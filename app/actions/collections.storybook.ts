import type { Document } from '@lib/types'

export function getDocumentsForCollectionAction(_collectionId: string): Promise<Document[]> {
  return Promise.resolve([])
}

export function getDocumentsNotInCollectionAction(_collectionId: string): Promise<Document[]> {
  return Promise.resolve([])
}

export function addDocumentsToCollectionAction(_collectionId: string, _documentIds: string[]): Promise<void> {
  return Promise.resolve()
}

export function removeDocumentsFromCollectionAction(_collectionId: string, _documentIds: string[]): Promise<void> {
  return Promise.resolve()
}
