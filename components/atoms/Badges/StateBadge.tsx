import type { ReactNode } from 'react'

import { StatusPill, statusVariantMap } from '@atoms/Badges/StatusPill'

interface StateBadgeProps {
  state?: string
  className?: string
}

export const stateVariantMap = statusVariantMap

/**
 * Atom: Semantic wrapper around Badge that maps state strings to variants.
 */
export function StateBadge({ state, className = '' }: StateBadgeProps): ReactNode {
  return <StatusPill status={state} className={`${className}`.trim()} />
}
