import type { ReactNode } from 'react'
import { Badge, type BadgeVariant } from '@atoms/Badges/Badge'

interface StateBadgeProps {
  state?: string
  className?: string
}

export const stateVariantMap = {
  completed: 'success',
  failed: 'danger',
  under_review: 'info',
} as const

/**
 * Atom: Semantic wrapper around Badge that maps state strings to variants.
 */
export function StateBadge({ state, className = '' }: StateBadgeProps): ReactNode {
  const normalized = (state ?? 'unknown').toLowerCase()
  const variant: BadgeVariant =
    stateVariantMap[(normalized ?? '').toLowerCase() as keyof typeof stateVariantMap] ?? 'neutral'
  const componentClass = `${className}`.trim()

  return (
    <Badge className={componentClass} variant={variant}>
      {normalized}
    </Badge>
  )
}
