export const TRIMMED_TRAIL = '...'

const METADATA_ACRONYMS = {
  api: 'API',
  dc: 'DC',
  id: 'ID',
  iso: 'ISO',
  ocr: 'OCR',
  pdf: 'PDF',
  url: 'URL',
  uuid: 'UUID',
} as const

/**
 * Converts a metadata field name into a human-readable label.
 * Known metadata acronyms retain their conventional capitalization.
 */
export function humanizeMetadataName(name: string): string {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => {
      const acronym = METADATA_ACRONYMS[part.toLowerCase() as keyof typeof METADATA_ACRONYMS]
      return acronym ?? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`
    })
    .join(' ')
}

/**
 * Truncates a string to maxLength characters.
 * Returns null if the trimmed value is empty or already within limit.
 */
export function truncateString(value: string | null | undefined, maxLength?: number): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  if (!maxLength || trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength)}${TRIMMED_TRAIL}`
}
