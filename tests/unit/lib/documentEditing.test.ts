import { describe, expect, it } from 'vitest'

import {
  formatDocumentDateInputValue,
  getDocumentMetadataValueType,
  normalizeDocumentEditValue,
  parseDocumentDateInputValue,
  serializeDocumentMetadataValue,
} from '@lib/documentEditing'

describe('document editing value handling', () => {
  it('normalizes empty strings to null', () => {
    expect(normalizeDocumentEditValue('  ')).toBeNull()
    expect(normalizeDocumentEditValue(null)).toBeNull()
  })

  it('normalizes list values without empty entries', () => {
    expect(normalizeDocumentEditValue([' Subject one ', '', 'Subject two '])).toEqual(['Subject one', 'Subject two'])
  })

  it('assigns edit field types from metadata value types', () => {
    expect(getDocumentMetadataValueType('json')).toBe('json')
    expect(getDocumentMetadataValueType('boolean')).toBe('boolean')
    expect(getDocumentMetadataValueType('date')).toBe('date')
    expect(getDocumentMetadataValueType('unix_timestamp')).toBe('date')
    expect(getDocumentMetadataValueType('url')).toBe('url')
    expect(getDocumentMetadataValueType('string')).toBe('string')
    expect(getDocumentMetadataValueType(null)).toBe('string')
  })

  it('does not treat a string-valued sensitive field as a boolean', () => {
    expect(getDocumentMetadataValueType('string')).toBe('string')
  })

  it('serializes values using the metadata envelope consumed by the dashboard', () => {
    expect(serializeDocumentMetadataValue('dc_subject', ['Subject one', 'Subject two'])).toEqual({
      value: JSON.stringify({ value: ['Subject one', 'Subject two'] }),
      valueType: 'json',
    })
    expect(serializeDocumentMetadataValue('dc_subject_unesco', ['UNESCO term'])).toEqual({
      value: JSON.stringify({ value: ['UNESCO term'] }),
      valueType: 'json',
    })
    expect(serializeDocumentMetadataValue('dc_title', 'A title')).toEqual({
      value: JSON.stringify({ value: 'A title' }),
      valueType: 'string',
    })
    expect(serializeDocumentMetadataValue('dc_date', 1789171200)).toEqual({
      value: JSON.stringify({ value: 1789171200 }),
      valueType: 'unix_timestamp',
    })
  })

  it('converts document dates between date-input values and Unix timestamps', () => {
    expect(formatDocumentDateInputValue('2026-09-11')).toBe('2026-09-11')
    expect(formatDocumentDateInputValue('2026')).toBe('2026-01-01')
    expect(formatDocumentDateInputValue(1789171200)).toBe('2026-09-12')
    expect(parseDocumentDateInputValue('2026-09-12')).toBe(1789171200)
  })
})
