'use client'

import { useState } from 'react'

interface FileSizeProps {
  value: bigint | number | null | undefined
  className?: string
}

/**
 * Formats a file size in human-readable form (e.g. 1.5 MB) with click-to-toggle
 * to raw bytes. Hovering shows the inverse value as a tooltip.
 */
export function FileSize({ value, className = '' }: FileSizeProps): React.ReactNode {
  const [showRaw, setShowRaw] = useState(false)

  if (value === null || value === undefined) {
    return <span className={className}>{`-`}</span>
  }

  const raw: number = typeof value === 'bigint' ? Number(value) : (value ?? 0)
  const human = raw === 0 ? '0' : formatBytes(raw)
  const rawFormatted = `${Number(raw).toLocaleString()} bytes`
  const display = showRaw ? rawFormatted : human
  const tooltip = showRaw ? human : rawFormatted
  const componentClass = `cursor-pointer rounded px-1 py-0.5 text-sm hover:bg-sand ${className}`.trim()

  return (
    <span
      title={tooltip}
      className={componentClass}
      onClick={() => setShowRaw((prev) => !prev)}
    >
      {display}
    </span>
  )
}

function formatBytes(value: number): string {
  if (Number.isNaN(value)) {
    return '-'
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