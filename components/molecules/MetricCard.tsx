import type { ReactElement } from 'react'
import { Typography } from '@mui/material'

import { LinkCardFrame } from '@molecules/LinkCardFrame'

interface MetricCardProps {
  title: string
  value: number
  description: string
  href: string
  actionLabel?: string
}

export function MetricCard({ title, value, description, href, actionLabel = 'Open' }: MetricCardProps): ReactElement {
  return (
    <LinkCardFrame actionLabel={actionLabel} href={href} title={title} titleComponent={'p'} titleVariant={'overline'}>
      <>
        <Typography variant={'h3'} component={'p'} sx={{ color: 'text.primary' }}>
          {value.toLocaleString('en-US')}
        </Typography>
        <Typography variant={'body2'} sx={{ color: 'text.secondary' }}>
          {description}
        </Typography>
      </>
    </LinkCardFrame>
  )
}
