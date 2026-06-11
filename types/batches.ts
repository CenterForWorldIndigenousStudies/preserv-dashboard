export interface BatchSummary {
  batch_id: string
  batch_name: string | null
  started_at: Date | null
  property_key: string
  property_value: string | number | boolean | null
}
