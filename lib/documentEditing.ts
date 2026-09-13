import { EDITABLE_DOCUMENT_METADATA_FIELDS, METADATA_EXTRACTOR_METADATA_FIELDS } from '@constants/documentEditing'
import type { DocumentEditValue } from 'types/documentEditing'

export function normalizeDocumentEditValue(value: unknown): DocumentEditValue {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Document edit numbers must be finite.')
    }
    return value
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    const normalized = value.flatMap((item) => {
      if (typeof item !== 'string') {
        return []
      }

      const trimmed = item.trim()
      return trimmed.length > 0 ? [trimmed] : []
    })

    return normalized.length > 0 ? normalized : null
  }

  throw new TypeError('Document edit values must be strings, numbers, booleans, string arrays, or null.')
}

export function getDocumentMetadataValueType(valueType: string | null | undefined): string {
  const normalizedValueType = valueType?.toLowerCase()

  if (normalizedValueType === 'json') {
    return 'json'
  }

  if (normalizedValueType === 'boolean') {
    return 'boolean'
  }

  if (normalizedValueType === 'date' || normalizedValueType === 'unix_timestamp') {
    return 'date'
  }

  if (normalizedValueType === 'url' || normalizedValueType === 'link') {
    return 'url'
  }

  return 'string'
}

export function serializeDocumentMetadataValue(
  name: string,
  value: unknown,
  storedValueType?: string | null,
): { value: string | null; valueType: string } {
  const normalized = normalizeDocumentEditValue(value)
  const valueType =
    name === 'dc_date' && typeof normalized === 'number'
      ? 'unix_timestamp'
      : storedValueType ?? inferDocumentMetadataStorageValueType(normalized)

  if (normalized === null) {
    return { value: null, valueType }
  }

  return {
    value: JSON.stringify({ value: normalized }),
    valueType,
  }
}

function inferDocumentMetadataStorageValueType(value: DocumentEditValue): string {
  if (value === null) return 'string'
  if (Array.isArray(value)) return 'json'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  return 'string'
}

export function formatDocumentDateInputValue(value: DocumentEditValue): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
    if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`
    if (/^\d{5,}$/.test(trimmed)) return formatUnixTimestampAsDate(Number(trimmed))
  }

  if (typeof value === 'number') return formatUnixTimestampAsDate(value)

  return ''
}

function formatUnixTimestampAsDate(value: number): string {
  if (!Number.isFinite(value)) return ''
  const date = new Date(value * 1000)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

export function parseDocumentDateInputValue(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const milliseconds = Date.parse(`${trimmed}T00:00:00.000Z`)
  return Number.isNaN(milliseconds) ? null : Math.floor(milliseconds / 1000)
}

export function isKnownDocumentEditMetadataField(name: string): boolean {
  return (
    EDITABLE_DOCUMENT_METADATA_FIELDS.includes(name as (typeof EDITABLE_DOCUMENT_METADATA_FIELDS)[number]) ||
    METADATA_EXTRACTOR_METADATA_FIELDS.includes(name as (typeof METADATA_EXTRACTOR_METADATA_FIELDS)[number])
  )
}
