import { describe, it, expect } from 'vitest';
import { formatBytes, formatDateTime } from '@lib/format';

describe('formatBytes', () => {
  it('returns — for null', () => {
    expect(formatBytes(null)).toBe('—');
  });

  it('returns — for NaN', () => {
    expect(formatBytes(NaN)).toBe('—');
  });

  it('formats bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats KB correctly', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(10240)).toBe('10.0 KB');
  });

  it('formats MB correctly', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });

  it('formats GB correctly', () => {
    expect(formatBytes(1073741824)).toBe('1.0 GB');
    expect(formatBytes(1610612736)).toBe('1.5 GB');
  });
});

describe('formatDateTime', () => {
  it('returns null for null', () => {
    expect(formatDateTime(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(formatDateTime(undefined)).toBeNull();
  });

  it('formats ISO string date correctly', () => {
    const result = formatDateTime('2024-06-15T14:30:00.000Z');
    expect(result).toMatch(/Jun 15, 2024/);
    expect(result).toMatch(/\d+:\d+ (AM|PM)/i); // matches "7:30 AM"
  });

  it('handles Date object input', () => {
    const date = new Date('2024-12-25T09:00:00.000Z');
    const result = formatDateTime(date);
    expect(result).toMatch(/Dec 25, 2024/);
    expect(result).toMatch(/\d+:\d+ (AM|PM)/i); // matches "1:00 AM"
  });

  it('returns null for invalid date string', () => {
    expect(formatDateTime('not-a-date')).toBeNull();
    expect(formatDateTime('2024-99-99')).toBeNull();
  });
});
