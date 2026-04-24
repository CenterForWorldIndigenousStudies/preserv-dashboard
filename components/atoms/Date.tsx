'use client'

import { useState, type ReactNode } from 'react'
import { DateTime } from 'luxon'

interface DateProps {
  value: string | number | Date | null | undefined
  className?: string
}

function formatDisplay(dt: DateTime): string {
  const hasTime = dt.hour !== 0 || dt.minute !== 0 || dt.second !== 0
  const hasDay = dt.day !== 1 || hasTime // day 1 with no time = partial
  const hasMonth = dt.month !== 1 || hasDay

  if (hasTime) return dt.toLocaleString(DateTime.DATETIME_MED)
  if (hasDay) return dt.toLocaleString(DateTime.DATE_MED)
  if (hasMonth) return `${dt.toLocaleString({ month: 'long' })} ${dt.year}`
  return String(dt.year)
}

function parseValue(value: string | number | Date | null | undefined): DateTime | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return DateTime.fromISO(value)
  if (typeof value === 'number') {
    const asNumber = Number(value)
    if (asNumber < 1e11) {
      return DateTime.fromSeconds(asNumber)
    }
    return DateTime.fromMillis(asNumber)
  }
  return DateTime.fromJSDate(value)
}

export function DateAtom({ value, className = '' }: DateProps): ReactNode {
  const [showRaw, setShowRaw] = useState(false)

  const dt = parseValue(value)
  if (!dt || !dt.isValid) {
    return <span className={className}>{`-`}</span>
  }

  const display = formatDisplay(dt)
  const raw = String(value)
  const computedClass = `cursor-pointer border-b border-dotted border-ink/30 hover:border-ink/70 transition-colors ${className}`.trim()

  return (
    <span
      className={computedClass}
      title={showRaw ? display : `Raw: ${raw}`}
      onClick={() => setShowRaw((prev) => !prev)}
    >
      {showRaw ? raw : display}
    </span>
  )
}
