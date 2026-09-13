function getDurationMilliseconds(value: unknown): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const duration = Number((value as { duration_ms?: unknown }).duration_ms)
  return Number.isFinite(duration) && duration >= 0 ? duration : null
}

export function calculateCurrentProcessingTime(details: Readonly<Record<string, unknown>>): number | null {
  let totalMilliseconds = 0
  let hasDuration = false

  for (const value of Object.values(details)) {
    const duration = getDurationMilliseconds(value)
    if (duration === null) {
      continue
    }

    totalMilliseconds += duration
    hasDuration = true
  }

  return hasDuration ? totalMilliseconds / 1000 : null
}

export function formatProcessingTime(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (typeof value !== 'number' && typeof value !== 'string') {
    return '—'
  }

  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds < 0) {
    return typeof value === 'string' ? value : '—'
  }

  return `${seconds} second${seconds === 1 ? '' : 's'}`
}
