import type { DocumentTablePageInfo, DocumentTableQuery } from '@organisms/DocumentTable/types'

export type BatchQueryFilters = Record<string, never>

export type BatchTableQuery = DocumentTableQuery<BatchQueryFilters>

export interface BatchListItem {
  id: string
  idLegacy: string | null
  name: string | null
  startedAt: string | Date | null
  documentCount: number
  totalCost: string
  processingTime: number | string | null
}

export interface BatchListPageResult {
  data: BatchListItem[]
  totalCount: number
  pageInfo: DocumentTablePageInfo
}

export interface BatchOverviewMetrics {
  totalBatches: number
  totalDocuments: number
}

export interface BatchProperty {
  key: string
  value: unknown
}

export interface BatchDetail {
  id: string
  name: string | null
  startedBy: string | null
  startedAt: string | Date | null
  properties: BatchProperty[]
}

export interface BatchSearchSuggestion {
  id: string
  name: string
  score: number
}

export interface BatchSearchResponse {
  batches: BatchSearchSuggestion[]
  exactMatch: BatchSearchSuggestion | null
}
