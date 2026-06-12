'use client'

import { useState } from 'react'
import { formatBytes } from '@lib/formatBytes'

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
    <span title={tooltip} className={componentClass} onClick={() => setShowRaw((prev) => !prev)}>
      {display}
    </span>
  )
}
