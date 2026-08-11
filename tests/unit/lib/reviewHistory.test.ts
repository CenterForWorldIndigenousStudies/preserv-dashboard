import { describe, expect, it } from 'vitest'

import { appendReviewHistoryEpisode, normalizeReviewHistoryValue } from '@lib/reviewHistory'
import type { ReviewHistoryEpisode } from 'types/reviewHistory'

const firstEpisode: ReviewHistoryEpisode = {
  episode_id: 'episode-1',
  resolved_at: '2026-08-10T18:30:00.000Z',
  resolved_by: 'reviewer@example.org',
  decision: 'APPROVED',
  validation_status_before: 'NEEDS_REVIEW',
  reasons: [
    {
      serviceKey: 'document_splitter_1',
      serviceLabel: 'Document Splitter Pass 1',
      reasons: ['Boundary requires review.'],
    },
  ],
  source: 'dashboard_decision',
  inferred: false,
}

const secondEpisode: ReviewHistoryEpisode = {
  ...firstEpisode,
  episode_id: 'episode-2',
  decision: 'REJECTED',
  resolved_by: null,
}

describe('normalizeReviewHistoryValue', () => {
  it('returns an empty versioned history for null', () => {
    expect(normalizeReviewHistoryValue(null)).toEqual({ version: 1, episodes: [] })
  })

  it('preserves valid versioned history episodes', () => {
    expect(normalizeReviewHistoryValue({ version: 1, episodes: [firstEpisode] })).toEqual({
      version: 1,
      episodes: [firstEpisode],
    })
  })

  it('unwraps stored JSON metadata values', () => {
    expect(normalizeReviewHistoryValue(JSON.stringify({ value: { version: 1, episodes: [firstEpisode] } }))).toEqual({
      version: 1,
      episodes: [firstEpisode],
    })
  })

  it('preserves malformed values for later inspection', () => {
    expect(normalizeReviewHistoryValue('malformed')).toEqual({
      version: 1,
      episodes: [],
      legacy_values: ['malformed'],
    })
  })
})

describe('appendReviewHistoryEpisode', () => {
  it('appends to the existing episode list without replacing prior episodes', () => {
    expect(appendReviewHistoryEpisode({ version: 1, episodes: [firstEpisode] }, secondEpisode)).toEqual({
      version: 1,
      episodes: [firstEpisode, secondEpisode],
    })
  })

  it('retains malformed legacy values while appending a new episode', () => {
    expect(appendReviewHistoryEpisode('malformed', firstEpisode)).toEqual({
      version: 1,
      episodes: [firstEpisode],
      legacy_values: ['malformed'],
    })
  })
})
