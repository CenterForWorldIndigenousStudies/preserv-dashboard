export interface PipelineSummary {
  total: number
  by_validation_status: Record<string, number>
  by_state: Record<string, number>
}
