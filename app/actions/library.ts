'use server'

import { getLibraryDocuments } from '@lib/queries/libraryQueries'
import type { DocumentsQueryParams } from '@lib/queries/documentQueries'

export async function getLibraryDocumentsAction(params: DocumentsQueryParams = {}) {
  return getLibraryDocuments(params)
}
