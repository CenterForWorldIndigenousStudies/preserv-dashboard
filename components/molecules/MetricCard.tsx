import type { ReactElement } from 'react'

import { Card, CardActions, CardContent, Stack, Typography } from '@mui/material'

import { Button } from '@atoms/Button'

interface MetricCardProps {
  title: string
  value: number
  description: string
  href: string
  actionLabel?: string
}

export function MetricCard({
  title,
  value,
  description,
  href,
  actionLabel = 'Open',
}: MetricCardProps): ReactElement {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, pb: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {title}
          </Typography>
          <Typography variant="h3" component="p" sx={{ color: 'text.primary' }}>
            {value.toLocaleString('en-US')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {description}
          </Typography>
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
        <Button href={href} variant="secondary">
          {actionLabel}
        </Button>
      </CardActions>
    </Card>
  )
}
