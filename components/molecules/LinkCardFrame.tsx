import type { ReactElement, ReactNode } from 'react'
import { Card, CardActions, CardContent, Stack, Typography } from '@mui/material'

import { Button } from '@atoms/Button'

interface LinkCardFrameProps {
  actionLabel: string
  children: ReactNode
  eyebrow?: string
  href: string
  title: string
  titleComponent?: React.ElementType
  titleVariant?: 'h6' | 'overline'
}

export function LinkCardFrame({
  actionLabel,
  children,
  eyebrow,
  href,
  title,
  titleComponent = 'h3',
  titleVariant = 'h6',
}: LinkCardFrameProps): ReactElement {
  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CardContent sx={{ flexGrow: 1, pb: 2 }}>
        <Stack spacing={1.5}>
          {eyebrow ? (
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              {eyebrow}
            </Typography>
          ) : null}
          <Typography component={titleComponent} variant={titleVariant} sx={{ color: 'text.primary' }}>
            {title}
          </Typography>
          {children}
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
