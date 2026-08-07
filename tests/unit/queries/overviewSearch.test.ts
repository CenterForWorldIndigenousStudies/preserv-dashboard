import { describe, expect, it } from 'vitest'
import { VALIDATION_STATUS_OPTIONS } from '@constants/validationStatuses'
import {
  ACCESS_LEVEL_LABELS,
  ACCESS_LEVEL_OPTIONS,
  normalizeAccessLevel,
  normalizeDateFilter,
  normalizeDocumentType,
  normalizeStatuses,
  parseStatusesParam,
  serializeStatusesParam,
} from '@lib/search'

describe('overview search helpers', () => {
  it('uses the canonical normalized validation statuses', () => {
    expect(VALIDATION_STATUS_OPTIONS).toEqual([
      'VALIDATED',
      'APPROVED',
      'FORMAT_ERRORS',
      'METADATA_ISSUES',
      'NEEDS_REVIEW',
      'GENERAL_ERRORS',
      'REJECTED',
    ])
  })

  it('exposes the canonical access levels and labels', () => {
    expect(ACCESS_LEVEL_OPTIONS).toEqual(['public', 'restricted', 'internal', 'admin', 'confidential'])
    expect(ACCESS_LEVEL_LABELS).toEqual({
      public: 'Open access',
      restricted: 'Restricted access',
      internal: 'Internal use only',
      admin: 'Administrative access',
      confidential: 'Confidential access',
    })
  })

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
    expect(normalizeAccessLevel('PUBLIC')).toBe('public')
    expect(normalizeAccessLevel('Admin')).toBe('admin')
    expect(normalizeAccessLevel('Open Access')).toBeUndefined()
    expect(normalizeAccessLevel('secret')).toBeUndefined()
  })

  it('accepts only yyyy-mm-dd date filters', () => {
    expect(normalizeDateFilter('2026-04-28')).toBe('2026-04-28')
    expect(normalizeDateFilter('04/28/2026')).toBeUndefined()
  })
})
