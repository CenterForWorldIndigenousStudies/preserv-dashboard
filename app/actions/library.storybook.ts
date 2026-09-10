import type { LibraryDocumentsPageResult } from 'types/documents'
import type { DocumentsQueryParams } from '@lib/queries/documentQueries'

export function getLibraryDocumentsAction(_params: DocumentsQueryParams = {}): Promise<LibraryDocumentsPageResult> {
  return Promise.resolve({
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  })
}
