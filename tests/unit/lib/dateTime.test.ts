import { describe, it, expect } from 'vitest'
import { formatDateTime } from '@lib/dateTime'

describe('formatDateTime', () => {
  it('returns null for null', () => {
    expect(formatDateTime(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(formatDateTime(undefined)).toBeNull()
  })

  it('formats ISO string date correctly', () => {
    const result = formatDateTime('2024-06-15T14:30:00.000Z')
    expect(result).toMatch(/Jun 15, 2024/)
    expect(result).toMatch(/\d+:\d+ (AM|PM)/i) // matches "7:30 AM"
  })

  it('handles Date object input', () => {
    const date = new Date('2024-12-25T09:00:00.000Z')
    const result = formatDateTime(date)
    expect(result).toMatch(/Dec 25, 2024/)
    expect(result).toMatch(/\d+:\d+ (AM|PM)/i) // matches "1:00 AM"
  })

  it('returns null for invalid date string', () => {
    expect(formatDateTime('not-a-date')).toBeNull()
    expect(formatDateTime('2024-99-99')).toBeNull()
  })
})
