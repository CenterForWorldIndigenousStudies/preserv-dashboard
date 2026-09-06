import type { ReactElement } from 'react'
import { Typography } from '@mui/material'

import { formatCost } from '@lib/processingCost'

interface CostProps {
  value: unknown
}

/** Render a cost using the dashboard's canonical currency format. */
export function Cost({ value }: CostProps): ReactElement {
  return (
    <Typography component={'span'} variant={'body2'}>
      {formatCost(value)}
    </Typography>
  )
}
