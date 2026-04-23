// MetadataRecord import removed — formatMetadataValue now uses unknown

import type { ReactNode } from 'react'

export interface ParsedMetadataValue {
  display: ReactNode // renderable React node
  plainText: string // plain text for search/copy
}

export function formatDateTime(value: string | Date | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatBytes(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—'
  }

  if (value < 1024) {
    return `${value} B`
  }

  const units = ['KB', 'MB', 'GB', 'TB']
  let currentValue = value / 1024
  let unitIndex = 0

  while (currentValue >= 1024 && unitIndex < units.length - 1) {
    currentValue /= 1024
    unitIndex += 1
  }

  return `${currentValue.toFixed(1)} ${units[unitIndex]}`
}

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
 * Returns a ParsedMetadataValue with a renderable display and plain text.
 */
export function parseMetadataValue(
  rawValue: string | null | undefined,
  valueType: string | null | undefined,
): ParsedMetadataValue {
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
    return {
      display: (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#355834] hover:underline">
          {url}
        </a>
      ),
      plainText: url,
    }
  }

  if (effectiveType === 'date') {
    const formatted = formatDateTime(strValue)
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
function formatLinkableText(text: string): ParsedMetadataValue {
  const trimmed = text.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      display: (
        <a href={trimmed} target="_blank" rel="noopener noreferrer" className="text-[#355834] hover:underline">
          {trimmed}
        </a>
      ),
      plainText: trimmed,
    }
  }
  return { display: trimmed, plainText: trimmed }
}

/**
 * Format a pretty-printed JSON string for display.
 */
function formatJsonDisplay(jsonString: string): ParsedMetadataValue {
  return {
    display: (
      <pre
        style={{
          fontSize: '0.75rem',
          backgroundColor: '#f4f1f0',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
        }}
      >
        {jsonString}
      </pre>
    ),
    plainText: jsonString,
  }
}
