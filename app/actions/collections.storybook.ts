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

export function createCollectionAction(_input: {
  tagId?: string
  tagName?: string
  tagNotes?: string
  qualifierTagIds?: string[]
  qualifierTagNames?: string[]
  collectionNotes?: string
  fedoraNodeId?: string
}): Promise<void> {
  return Promise.resolve()
}

export function createCollectionWithNewTagAction(_input: {
  tagName: string
  tagNotes?: string
  qualifierTagIds?: string[]
  qualifierTagNames?: string[]
  collectionNotes?: string
  fedoraNodeId?: string
}): Promise<void> {
  return Promise.resolve()
}

export function deleteCollectionAction(
  _collectionId: string,
  _options?: { deleteTagFromSystem?: boolean },
): Promise<void> {
  return Promise.resolve()
}

export function getCollectionDeletionPreviewAction(_collectionId: string): Promise<{
  collectionId: string
  tagsToDelete: Array<{ tagId: string; tagName: string }>
  blockedTags: Array<{ tagId: string; tagName: string; collectionId: string; collectionName: string }>
}> {
  return Promise.resolve({ collectionId: _collectionId, tagsToDelete: [], blockedTags: [] })
}

export function removeDocumentsFromCollectionAction(_collectionId: string, _documentIds: string[]): Promise<void> {
  return Promise.resolve()
}
