"use server"

import { getAllDocuments, type DocumentsQueryParams } from "@lib/queries"

export async function getDocumentsAction(params: DocumentsQueryParams = {}) {
  return getAllDocuments(params)
}
