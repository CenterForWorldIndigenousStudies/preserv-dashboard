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
