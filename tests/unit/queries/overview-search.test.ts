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
    expect(normalizeOverviewStatuses([' Approved ', 'approved', 'FAILED'])).toEqual(['approved', 'failed'])
  })

  it('drops invalid statuses', () => {
    expect(normalizeOverviewStatuses(['unknown', ''])).toBeUndefined()
  })

  it('parses and serializes status query params', () => {
    const statuses = parseOverviewStatusesParam('approved,failed,approved')
    expect(statuses).toEqual(['approved', 'failed'])
    expect(serializeOverviewStatusesParam(statuses)).toBe('approved,failed')
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
