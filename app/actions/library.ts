'use server'

import { getLibraryDocuments, type LibraryDocumentsQueryParams } from '@lib/queries/libraryQueries'

export async function getLibraryDocumentsAction(params: LibraryDocumentsQueryParams = {}) {
  return getLibraryDocuments(params)
}
