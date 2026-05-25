import { describe, expect, it } from 'vitest'
import {
  normalizeOverviewAccessLevel,
  normalizeOverviewDateFilter,
  normalizeOverviewDocumentType,
  normalizeOverviewStatuses,
  parseOverviewStatusesParam,
  serializeOverviewStatusesParam,
} from '@lib/overview-search'

describe('overview search helpers', () => {
  it('normalizes and de-duplicates statuses', () => {
    expect(normalizeOverviewStatuses([' Approved ', 'approved', 'needs_review'])).toEqual(['APPROVED', 'NEEDS_REVIEW'])
  })

  it('parses and serializes status query params', () => {
    const statuses = parseOverviewStatusesParam('approved,needs_review,approved')
    expect(statuses).toEqual(['APPROVED', 'NEEDS_REVIEW'])
    expect(serializeOverviewStatusesParam(statuses)).toBe('APPROVED,NEEDS_REVIEW')
  })

  it('validates document type values', () => {
    expect(normalizeOverviewDocumentType('duplicate')).toBe('duplicate')
    expect(normalizeOverviewDocumentType('other')).toBeUndefined()
  })

  it('validates access levels case-insensitively', () => {
    expect(normalizeOverviewAccessLevel('Open Access')).toBe('open access')
    expect(normalizeOverviewAccessLevel('secret')).toBeUndefined()
  })

  it('accepts only yyyy-mm-dd date filters', () => {
    expect(normalizeOverviewDateFilter('2026-04-28')).toBe('2026-04-28')
    expect(normalizeOverviewDateFilter('04/28/2026')).toBeUndefined()
  })
})
