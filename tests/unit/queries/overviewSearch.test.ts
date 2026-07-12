import { describe, expect, it } from 'vitest'
import {
  normalizeAccessLevel,
  normalizeDateFilter,
  normalizeDocumentType,
  normalizeStatuses,
  parseStatusesParam,
  serializeStatusesParam,
} from '@lib/search'

describe('overview search helpers', () => {
  it('normalizes and de-duplicates statuses', () => {
    expect(normalizeStatuses([' Approved ', 'approved', 'needs_review'])).toEqual(['APPROVED', 'NEEDS_REVIEW'])
  })

  it('parses and serializes status query params', () => {
    const statuses = parseStatusesParam('approved,needs_review,approved')
    expect(statuses).toEqual(['APPROVED', 'NEEDS_REVIEW'])
    expect(serializeStatusesParam(statuses)).toBe('APPROVED,NEEDS_REVIEW')
  })

  it('validates document type values', () => {
    expect(normalizeDocumentType('duplicate')).toBe('duplicate')
    expect(normalizeDocumentType('other')).toBeUndefined()
  })

  it('validates access levels case-insensitively', () => {
    expect(normalizeAccessLevel('Open Access')).toBe('open access')
    expect(normalizeAccessLevel('secret')).toBeUndefined()
  })

  it('accepts only yyyy-mm-dd date filters', () => {
    expect(normalizeDateFilter('2026-04-28')).toBe('2026-04-28')
    expect(normalizeDateFilter('04/28/2026')).toBeUndefined()
  })
})
