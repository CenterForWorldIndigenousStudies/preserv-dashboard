import type { ReactElement } from 'react'
import { Typography } from '@mui/material'

import { formatProcessingTime } from '@lib/processingTime'

interface ProcessingTimeProps {
  value: unknown
}

/** Render a processing duration with its seconds unit. */
export function ProcessingTime({ value }: ProcessingTimeProps): ReactElement {
  return (
    <Typography component={'span'} variant={'body2'}>
      {formatProcessingTime(value)}
    </Typography>
  )
}
