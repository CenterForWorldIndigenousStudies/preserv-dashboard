'use server'

import { getAllDocuments, type DocumentsQueryParams } from '@lib/queries/documentQueries'

export async function getDocumentsAction(params: DocumentsQueryParams = {}) {
  return getAllDocuments(params)
}
