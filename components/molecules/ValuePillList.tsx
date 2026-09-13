import type { ReactElement, ReactNode } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { ValuePill } from '@atoms/ValuePill'

interface ValuePillListProps {
  values: readonly string[]
  emptyMessage?: string
  onRemove?: (value: string, index: number) => void
  getTooltip?: (value: string, index: number) => ReactNode
  getHref?: (value: string, index: number) => string | undefined
}

export function ValuePillList({
  values,
  emptyMessage = 'No values available.',
  onRemove,
  getTooltip,
  getHref,
}: ValuePillListProps): ReactElement {
  if (values.length === 0) {
    return (
      <Typography variant={'body2'} color={'text.secondary'}>
        {emptyMessage}
      </Typography>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {values.map((value, index) => (
        <ValuePill
          key={`${value}-${index}`}
          value={value}
          href={getHref?.(value, index)}
          tooltip={getTooltip?.(value, index)}
          onRemove={onRemove ? () => onRemove(value, index) : undefined}
        />
      ))}
    </Box>
  )
}
