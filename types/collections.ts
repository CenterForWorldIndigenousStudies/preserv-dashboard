export interface CollectionWithMeta {
  id: string
  tag_id: string
  collection_name: string
  notes: string | null
  created_at: Date | string | null
  updated_at: Date | string | null
  document_count: number
}
