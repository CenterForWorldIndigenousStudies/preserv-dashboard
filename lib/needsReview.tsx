import { getPipelineServiceDisplayName } from '@constants/pipelineServices'
import { formatMetadataValue } from '@lib/metadata'
import type { NeedsReviewReasonGroup } from 'types/needsReview'

export type { NeedsReviewReasonGroup } from 'types/needsReview'

const REVIEW_QUEUE_FALLBACK_REASONS: Record<string, string> = {
  NEEDS_REVIEW: 'Document requires human review.',
  METADATA_ISSUES: 'Document has metadata issues.',
  FORMAT_ERRORS: 'Document has format errors.',
  GENERAL_ERRORS: 'Document has general errors.',
}

function normalizeReasonMessages(value: unknown): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function isNeedsReviewReasonGroup(value: unknown): value is NeedsReviewReasonGroup {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const group = value as Partial<NeedsReviewReasonGroup>
  return (
    typeof group.serviceKey === 'string' &&
    typeof group.serviceLabel === 'string' &&
    Array.isArray(group.reasons) &&
    group.reasons.every((reason) => typeof reason === 'string')
  )
}

function unwrapNeedsReviewValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 1 &&
      Object.prototype.hasOwnProperty.call(value, 'value')
    ) {
      return unwrapNeedsReviewValue((value as { value: unknown }).value)
    }

    return value
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return value
  }

  try {
    return unwrapNeedsReviewValue(JSON.parse(trimmed))
  } catch {
    return value
  }
}

export function normalizeNeedsReviewValue(value: unknown): NeedsReviewReasonGroup[] {
  const unwrappedValue = unwrapNeedsReviewValue(value)

  if (unwrappedValue === null || unwrappedValue === undefined) {
    return []
  }

  if (typeof unwrappedValue === 'string') {
    const reasons = normalizeReasonMessages(unwrappedValue)
    return reasons.length === 0
      ? []
      : [
          {
            serviceKey: 'legacy',
            serviceLabel: 'Legacy',
            reasons,
          },
        ]
  }

  if (Array.isArray(unwrappedValue)) {
    if (unwrappedValue.length > 0 && unwrappedValue.every(isNeedsReviewReasonGroup)) {
      return unwrappedValue
    }

    const reasons = normalizeReasonMessages(unwrappedValue)
    return reasons.length === 0
      ? []
      : [
          {
            serviceKey: 'legacy',
            serviceLabel: 'Legacy',
            reasons,
          },
        ]
  }

  if (typeof unwrappedValue === 'object') {
    const groups = Object.entries(unwrappedValue as Record<string, unknown>)
      .map(([serviceKey, messages]) => {
        const reasons = normalizeReasonMessages(messages)
        if (reasons.length === 0) {
          return null
        }

        return {
          serviceKey,
          serviceLabel: getPipelineServiceDisplayName(serviceKey),
          reasons,
        } satisfies NeedsReviewReasonGroup
      })
      .filter((group): group is NeedsReviewReasonGroup => group !== null)

    if (groups.length > 0) {
      return groups
    }
  }

  const fallbackReason = formatMetadataValue(unwrappedValue)
  return fallbackReason
    ? [
        {
          serviceKey: 'legacy',
          serviceLabel: 'Legacy',
          reasons: [fallbackReason],
        },
      ]
    : []
}

export function composeReviewQueueReasons(value: unknown, validationStatus: string | null | undefined) {
  const explicitReasons = normalizeNeedsReviewValue(value)
  if (explicitReasons.length > 0) {
    return explicitReasons
  }

  const fallbackReason = validationStatus
    ? REVIEW_QUEUE_FALLBACK_REASONS[validationStatus.trim().toUpperCase()]
    : undefined

  return fallbackReason
    ? [
        {
          serviceKey: 'review_queue',
          serviceLabel: 'Review Queue',
          reasons: [fallbackReason],
        },
      ]
    : []
}
