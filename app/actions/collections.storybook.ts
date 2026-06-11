import type { PaginatedDocumentsResult } from 'types/pagination'

export function getDocumentsForCollectionAction(_collectionId: string): Promise<PaginatedDocumentsResult> {
  return Promise.resolve({ documents: [], total: 0 })
}

export function getDocumentsNotInCollectionAction(_collectionId: string): Promise<PaginatedDocumentsResult> {
  return Promise.resolve({ documents: [], total: 0 })
}

export function addDocumentsToCollectionAction(_collectionId: string, _documentIds: string[]): Promise<void> {
  return Promise.resolve()
}

export function createCollectionAction(_input: { tagId: string; collectionNotes?: string }): Promise<void> {
  return Promise.resolve()
}

export function createCollectionWithNewTagAction(_input: {
  tagName: string
  tagNotes?: string
  collectionNotes?: string
}): Promise<void> {
  return Promise.resolve()
}

export function deleteCollectionAction(
  _collectionId: string,
  _options?: { deleteTagFromSystem?: boolean },
): Promise<void> {
  return Promise.resolve()
}

export function removeDocumentsFromCollectionAction(_collectionId: string, _documentIds: string[]): Promise<void> {
  return Promise.resolve()
}
