'use client'

import { createContext, useContext } from 'react'

import type {
  DocumentEditContributor,
  DocumentEditPublisher,
  DocumentEditSnapshot,
  DocumentEditTag,
  DocumentEditValue,
} from 'types/documentEditing'

export interface DocumentEditContextValue {
  isEditing: boolean
  draft: DocumentEditSnapshot
  updateMetadata: (name: string, value: DocumentEditValue) => void
  updateQuality: (field: 'comment' | 'commentAdditional', value: string | null) => void
  updateTags: (tags: DocumentEditTag[]) => void
  deleteTag: (tagId: string) => void
  updateContributors: (contributors: DocumentEditContributor[]) => void
  updatePublishers: (publishers: DocumentEditPublisher[]) => void
}

export const DocumentEditContext = createContext<DocumentEditContextValue | null>(null)

export function useDocumentEditContext(): DocumentEditContextValue | null {
  return useContext(DocumentEditContext)
}
