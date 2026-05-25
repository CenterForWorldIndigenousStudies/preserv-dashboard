import type { ReactElement } from 'react'

import { Badge, type BadgeVariant } from '@atoms/Badges/Badge'

interface IngestStatusBadgeProps {
  status?: string | null
  className?: string
}

export const statusVariantMap = {
  completed: 'success',
  failed: 'danger',
  running: 'info',
} as const

export function IngestStatusBadge({ status, className }: IngestStatusBadgeProps): ReactElement {
  const normalized = (status ?? 'unknown').toLowerCase()
  const variant: BadgeVariant =
    statusVariantMap[(normalized ?? '').toLowerCase() as keyof typeof statusVariantMap] ?? 'neutral'
  const componentClass = `${className}`.trim()

  return (
    <Badge className={componentClass} variant={variant}>
      {normalized}
    </Badge>
  )
}
