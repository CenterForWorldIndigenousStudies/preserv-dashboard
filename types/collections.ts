import type { DocumentTablePageInfo, DocumentTableQuery } from '@organisms/DocumentTable/types'
import type { AdvancedSearchFilters } from '@lib/search'

export type CollectionQueryFilters = AdvancedSearchFilters

export type CollectionTableQuery = DocumentTableQuery<CollectionQueryFilters>

export interface CollectionListPageResult {
  data: CollectionWithMeta[]
  totalCount: number
  pageInfo: DocumentTablePageInfo
}

export interface CollectionWithMeta {
  id: string
  tag_id: string
  collection_name: string
  canonical_tag?: {
    id: string
    name: string
  }
  qualifiers?: Array<{
    id: string
    name: string
  }>
  fedora_node_id?: string | null
  notes: string | null
  created_at: Date | string | null
  updated_at: Date | string | null
  document_count: number
}

/** Collection details saved with a batch draft until Data Ingester starts. */
export interface CollectionProposal {
  name: string
  notes: string | null
  tagNotes: string | null
  qualifierNames: string[]
  fedoraNodeId: string | null
}
