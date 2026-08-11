export const REVIEW_QUEUE_CHECKLIST_ITEMS = [
  { key: 'metadataReviewed', label: 'Metadata reviewed' },
  { key: 'rightsReviewed', label: 'Rights reviewed' },
  { key: 'classificationReviewed', label: 'Classification reviewed' },
  { key: 'duplicatesChecked', label: 'Duplicates checked' },
  { key: 'completenessReviewed', label: 'Completeness reviewed' },
] as const

export type ReviewQueueChecklistItemKey = (typeof REVIEW_QUEUE_CHECKLIST_ITEMS)[number]['key']

export type ReviewQueueChecklistState = Record<ReviewQueueChecklistItemKey, boolean>

export function buildDefaultReviewQueueChecklistState(): ReviewQueueChecklistState {
  return {
    metadataReviewed: false,
    rightsReviewed: false,
    classificationReviewed: false,
    duplicatesChecked: false,
    completenessReviewed: false,
  }
}

export function isReviewQueueChecklistItemKey(value: string): value is ReviewQueueChecklistItemKey {
  return REVIEW_QUEUE_CHECKLIST_ITEMS.some((item) => item.key === value)
}

export function normalizeReviewQueueChecklist(value: unknown): ReviewQueueChecklistState {
  const normalized = buildDefaultReviewQueueChecklistState()
  let candidateValue = value

  if (typeof candidateValue === 'string') {
    try {
      candidateValue = JSON.parse(candidateValue) as unknown
    } catch {
      return normalized
    }
  }

  if (typeof candidateValue !== 'object' || candidateValue === null || Array.isArray(candidateValue)) {
    return normalized
  }

  for (const item of REVIEW_QUEUE_CHECKLIST_ITEMS) {
    const itemValue = (candidateValue as Record<string, unknown>)[item.key]
    if (typeof itemValue === 'boolean') {
      normalized[item.key] = itemValue
    }
  }

  return normalized
}
