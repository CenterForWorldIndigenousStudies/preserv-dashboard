import { formatDateTime } from '@lib/dateTime'
import { formatJsonDisplay } from '@lib/json'
import { formatLinkableText } from '@lib/formatLinkableText'
import type { DisplayAndString } from 'types/shapes'

export function formatMetadataValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return JSON.stringify(value, null, 2)
}

/**
 * Parse a metadata value from {"value": [...]} JSON structure.
 * Returns a DisplayAndString with a renderable display and plain text.
 */
export function parseMetadataValue(
  rawValue: string | null | undefined,
  valueType: string | null | undefined,
): DisplayAndString {
  // Default: blank
  if (!rawValue) {
    return { display: '\u2014', plainText: '' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawValue)
  } catch {
    // Not JSON — treat as plain string
    return formatLinkableText(rawValue)
  }

  if (!parsed || typeof parsed !== 'object') {
    return formatLinkableText(rawValue)
  }

  const obj = parsed as Record<string, unknown>
  const inner = obj.value

  // If no "value" key, stringified JSON is the fallback display
  if (inner === undefined) {
    return formatLinkableText(rawValue)
  }

  // Determine effective type
  const effectiveType = (valueType ?? '').toLowerCase()
  const strValue = typeof inner === 'string' ? inner : JSON.stringify(inner)

  // Route by type
  if (effectiveType === 'url' || effectiveType === 'link') {
    const url = strValue.trim()
    return formatLinkableText(url)
  }

  if (effectiveType === 'date') {
    const formatted = formatDateTime(strValue)
    return { display: formatted ?? strValue, plainText: strValue }
  }

  if (effectiveType === 'unix_timestamp') {
    // Convert to an integer.
    const formatted = parseInt(strValue, 10)
    return { display: formatted ?? strValue, plainText: strValue }
  }

  if (effectiveType === 'boolean') {
    const boolVal = Boolean(inner)
    return { display: boolVal ? 'True' : 'False', plainText: String(boolVal) }
  }

  if (effectiveType === 'number') {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return { display: String(inner), plainText: String(inner) }
  }

  if (effectiveType === 'json') {
    const formatted = JSON.stringify(inner, null, 2)
    return formatJsonDisplay(formatted)
  }

  // text/string or unknown — check if it looks like a URL
  return formatLinkableText(strValue)
}
