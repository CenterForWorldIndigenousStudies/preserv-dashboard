import type { NeedsReviewReasonGroup } from 'types/needsReview'
import type { ReviewHistoryEpisode, ReviewHistoryValue } from 'types/reviewHistory'

function unwrapStoredValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 1 &&
      Object.prototype.hasOwnProperty.call(value, 'value')
    ) {
      return unwrapStoredValue((value as { value: unknown }).value)
    }

    return value
  }

  const trimmed = value.trim()
  if (!trimmed) return value

  try {
    return unwrapStoredValue(JSON.parse(trimmed))
  } catch {
    return value
  }
}

function isReasonGroup(value: unknown): value is NeedsReviewReasonGroup {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  const group = value as Partial<NeedsReviewReasonGroup>
  return (
    typeof group.serviceKey === 'string' &&
    typeof group.serviceLabel === 'string' &&
    Array.isArray(group.reasons) &&
    group.reasons.every((reason) => typeof reason === 'string')
  )
}

function isReviewHistoryEpisode(value: unknown): value is ReviewHistoryEpisode {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  const episode = value as Partial<ReviewHistoryEpisode>
  return (
    typeof episode.episode_id === 'string' &&
    typeof episode.resolved_at === 'string' &&
    (episode.resolved_by === null || typeof episode.resolved_by === 'string') &&
    (episode.decision === null || episode.decision === 'APPROVED' || episode.decision === 'REJECTED') &&
    (episode.validation_status_before === null || typeof episode.validation_status_before === 'string') &&
    Array.isArray(episode.reasons) &&
    episode.reasons.every(isReasonGroup) &&
    (episode.source === 'dashboard_decision' || episode.source === 'legacy_reconciliation') &&
    typeof episode.inferred === 'boolean'
  )
}

function withLegacyValues(value: ReviewHistoryValue, legacyValues: unknown[]): ReviewHistoryValue {
  return legacyValues.length > 0 ? { ...value, legacy_values: legacyValues } : value
}

export function normalizeReviewHistoryValue(value: unknown): ReviewHistoryValue {
  const unwrappedValue = unwrapStoredValue(value)
  if (unwrappedValue === null || unwrappedValue === undefined) {
    return { version: 1, episodes: [] }
  }

  if (typeof unwrappedValue === 'object' && unwrappedValue !== null && !Array.isArray(unwrappedValue)) {
    const candidate = unwrappedValue as Partial<ReviewHistoryValue>
    if (candidate.version === 1 && Array.isArray(candidate.episodes) && candidate.episodes.every(isReviewHistoryEpisode)) {
      const legacyValues = Array.isArray(candidate.legacy_values) ? candidate.legacy_values : []
      return withLegacyValues({ version: 1, episodes: candidate.episodes }, legacyValues)
    }
  }

  return {
    version: 1,
    episodes: [],
    legacy_values: [unwrappedValue],
  }
}

export function appendReviewHistoryEpisode(
  value: unknown,
  episode: ReviewHistoryEpisode,
): ReviewHistoryValue {
  const normalizedValue = normalizeReviewHistoryValue(value)
  return {
    ...normalizedValue,
    episodes: [...normalizedValue.episodes, episode],
  }
}
