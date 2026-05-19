export interface BatchSummary {
  batch_id: string
  batch_name: string | null
  batch_id_legacy: string | null
  property_key: string
  property_value: string | number | boolean | null
}
