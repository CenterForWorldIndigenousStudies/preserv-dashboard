'use server'

import { getLibraryDocuments, type DocumentsQueryParams } from '@lib/queries'

export async function getLibraryDocumentsAction(params: DocumentsQueryParams = {}) {
  return getLibraryDocuments(params)
}
