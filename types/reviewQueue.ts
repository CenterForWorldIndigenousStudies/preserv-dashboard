import { REVIEW_QUEUE_SORT_FIELDS } from '@constants/reviewQueue'

export interface ReviewQueuePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export type ReviewQueueDecision = 'APPROVED' | 'REJECTED'

export interface ReviewQueryParams {
  status?: string
  field?: string
  page?: number
}

export type ReviewQueueSortField = (typeof REVIEW_QUEUE_SORT_FIELDS)[number]

export interface ReviewQueueDocumentsQueryParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: ReviewQueueSortField
  sortDirection?: 'asc' | 'desc'
  validationStatus?: string
  needsReview?: boolean
  sensitive?: boolean
}

export interface ReviewQueueItem {
  id: string
  name: string | null
  validation_status: string | null
  validation_type: string | null
  validator_name: string | null
  validator_email: string | null
  needs_review: boolean
  sensitive: boolean
  queue_reasons: string[]
}
