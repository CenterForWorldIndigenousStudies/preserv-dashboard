import type { ReactNode } from 'react'
import { Badge, type BadgeVariant } from '@atoms/Badges/Badge'
import { DOCUMENT_STATES } from '@constants/documentStates'

interface StateBadgeProps {
  state?: string
  className?: string
}

export const stateVariantMap = {
  [DOCUMENT_STATES.APPROVED]: 'success',
  [DOCUMENT_STATES.FAILED]: 'danger',
  [DOCUMENT_STATES.INGESTED_FEDORA]: 'success',
  [DOCUMENT_STATES.REJECTED]: 'danger',
  [DOCUMENT_STATES.UNDER_REVIEW]: 'info',
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
