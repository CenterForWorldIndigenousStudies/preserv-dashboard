import type { ReactElement } from 'react'

import { Badge, type BadgeVariant } from '@atoms/Badges/Badge'

interface PipelineStageStatusBadgeProps {
  status?: string | null
  className?: string
}

const statusVariantMap = {
  accepted: 'neutral',
  queued: 'neutral',
  completed: 'success',
  failed: 'danger',
  running: 'info',
  review_needed: 'danger',
} as const satisfies Record<string, BadgeVariant>

export function PipelineStageStatusBadge({ status, className }: PipelineStageStatusBadgeProps): ReactElement {
  const normalized = (status ?? 'unknown').toLowerCase()
  const variant: BadgeVariant = statusVariantMap[normalized as keyof typeof statusVariantMap] ?? 'neutral'
  const componentClass = `${className ?? ''}`.trim()

  return (
    <Badge className={componentClass} variant={variant}>
      {normalized}
    </Badge>
  )
}
