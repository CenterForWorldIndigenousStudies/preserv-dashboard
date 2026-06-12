import { getPipelineServiceDisplayName } from '@constants/pipelineServices'
import { formatMetadataValue } from '@lib/metadata'

export interface NeedsReviewReasonGroup {
  serviceKey: string
  serviceLabel: string
  reasons: string[]
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

export function normalizeNeedsReviewValue(value: unknown): NeedsReviewReasonGroup[] {
  if (value === null || value === undefined) {
    return []
  }

  if (typeof value === 'string') {
    const reasons = normalizeReasonMessages(value)
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

  if (Array.isArray(value)) {
    const reasons = normalizeReasonMessages(value)
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

  if (typeof value === 'object') {
    const groups = Object.entries(value as Record<string, unknown>)
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

  const fallbackReason = formatMetadataValue(value)
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
