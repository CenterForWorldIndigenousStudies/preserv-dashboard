import { describe, it, expect } from 'vitest'
import { formatBytes } from '@lib/formatBytes'

describe('formatBytes', () => {
  it('returns — for null', () => {
    expect(formatBytes(null)).toBe('—')
  })

  it('returns — for NaN', () => {
    expect(formatBytes(NaN)).toBe('—')
  })

  it('formats bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1023)).toBe('1023 B')
  })

  it('formats KB correctly', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(10240)).toBe('10.0 KB')
  })

  it('formats MB correctly', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB')
    expect(formatBytes(1572864)).toBe('1.5 MB')
  })

  it('formats GB correctly', () => {
    expect(formatBytes(1073741824)).toBe('1.0 GB')
    expect(formatBytes(1610612736)).toBe('1.5 GB')
  })
})
