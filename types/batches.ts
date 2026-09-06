import type { DocumentTablePageInfo, DocumentTableQuery } from '@organisms/DocumentTable/types'
import type { AdvancedSearchFilters } from '@lib/search'
import type { MetadataField } from 'types/metadata'

export type BatchQueryFilters = AdvancedSearchFilters

export type BatchTableQuery = DocumentTableQuery<BatchQueryFilters>

export interface BatchListItem {
  id: string
  idLegacy: string | null
  name: string | null
  startedAt: string | Date | null
  documentCount: number
  totalCost: string
  processingTime: number | string | null
  lifecycleStatus?: string | null
  publicationStatus?: string | null
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
  createdAt: string | Date | null
  startedAt: string | Date | null
  properties: BatchProperty[]
  lifecycleStatus?: string | null
  publicationStatus?: string | null
  metadata: BatchMetadataField[]
}

export type BatchMetadataField = MetadataField

export interface BatchSearchSuggestion {
  id: string
  name: string
  score: number
}

export interface BatchSearchResponse {
  batches: BatchSearchSuggestion[]
  exactMatch: BatchSearchSuggestion | null
}
