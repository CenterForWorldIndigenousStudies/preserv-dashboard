export const TRIMMED_TRAIL = '...'

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
