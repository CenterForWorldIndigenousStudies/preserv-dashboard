import type { NeedsReviewReasonGroup } from 'types/needsReview'

export interface ReviewHistoryEpisode {
  episode_id: string
  resolved_at: string
  resolved_by: string | null
  decision: 'APPROVED' | 'REJECTED' | null
  validation_status_before: string | null
  reasons: NeedsReviewReasonGroup[]
  source: 'dashboard_decision' | 'legacy_reconciliation'
  inferred: boolean
}

export interface ReviewHistoryValue {
  version: 1
  episodes: ReviewHistoryEpisode[]
  legacy_values?: unknown[]
}
