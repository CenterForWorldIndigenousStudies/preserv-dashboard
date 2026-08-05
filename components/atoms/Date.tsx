'use client'

import { useState, type ReactNode } from 'react'
import { Typography } from '@mui/material'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'
import { DateTime } from 'luxon'

interface DateProps {
  value: string | number | Date | null | undefined
  className?: string
  sx?: SxProps<Theme>
}

const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

function formatDisplay(dt: DateTime): string {
  const canonical = dt.toUTC()
  const hasTime =
    canonical.hour !== 0 || canonical.minute !== 0 || canonical.second !== 0 || canonical.millisecond !== 0
  const hasDay = canonical.day !== 1 || hasTime // day 1 with no time = partial
  const hasMonth = canonical.month !== 1 || hasDay

  if (hasTime) return `${canonical.toFormat('yyyy-LL-dd HH:mm')} UTC`
  if (hasDay) return canonical.toFormat('yyyy-LL-dd')
  if (hasMonth) return `${ENGLISH_MONTHS[canonical.month - 1]} ${canonical.year}`
  return String(canonical.year)
}

function parseValue(value: string | number | Date | null | undefined): DateTime | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return DateTime.fromISO(value, { zone: 'utc', setZone: true })
  if (typeof value === 'number') {
    const asNumber = Number(value)
    if (asNumber < 1e11) {
      return DateTime.fromSeconds(asNumber, { zone: 'utc' })
    }
    return DateTime.fromMillis(asNumber, { zone: 'utc' })
  }
  return DateTime.fromJSDate(value, { zone: 'utc' })
}

function formatRawValue(value: string | number | Date): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  return value.toISOString()
}

export function DateAtom({ value, className = '', sx }: DateProps): ReactNode {
  const [showRaw, setShowRaw] = useState(false)

  if (value === null || value === undefined) {
    return (
      <Typography component="span" variant="body2" className={className || undefined} sx={sx}>
        -
      </Typography>
    )
  }

  const dt = parseValue(value)
  if (!dt || !dt.isValid) {
    return (
      <Typography component="span" variant="body2" className={className || undefined} sx={sx}>
        -
      </Typography>
    )
  }

  const display = formatDisplay(dt)
  const raw = formatRawValue(value)

  return (
    <Typography
      component="span"
      variant="body2"
      className={className || undefined}
      title={showRaw ? display : `Raw: ${raw}`}
      onClick={() => setShowRaw((prev) => !prev)}
      sx={(theme: Theme) => {
        const textColor = theme.palette.text.primary

        return {
          cursor: 'pointer',
          borderBottom: '1px dotted',
          borderColor: alpha(textColor, 0.3),
          transition: theme.transitions.create('border-color'),
          '&:hover': {
            borderColor: alpha(textColor, 0.7),
          },
          ...theme.unstable_sx(sx ?? {}),
        }
      }}
    >
      {showRaw ? raw : display}
    </Typography>
  )
}
