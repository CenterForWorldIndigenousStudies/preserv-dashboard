import type { Document } from 'types/documents'

export interface DocumentTableRow {
  id: string
  name: string | null
}

export interface DocumentsCursor {
  id: string
  value: string
}

export interface DocumentsPageInfo {
  page: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: DocumentsCursor | null
  endCursor: DocumentsCursor | null
}

export interface DocumentTablePageResult<TRow extends DocumentTableRow = DocumentTableRow> {
  data: TRow[]
  pageInfo: DocumentsPageInfo
}

export type DocumentsPageResult = DocumentTablePageResult<Document>

export interface PagedResult<T> {
  items: T[]
  total: number
}

export interface PaginatedDocumentsResult {
  documents: Document[]
  total: number
}
