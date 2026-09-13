import type { ReactNode } from 'react'

import { Badge, type BadgeVariant } from '@atoms/Badges/Badge'
import { GENERATED_DOCUMENT_STATES } from '@constants/generated/documentStates'

export const statusVariantMap = {
  [GENERATED_DOCUMENT_STATES.APPROVED]: 'success',
  complete: 'success',
  [GENERATED_DOCUMENT_STATES.FAILED]: 'danger',
  [GENERATED_DOCUMENT_STATES.INGESTED_FEDORA]: 'success',
  [GENERATED_DOCUMENT_STATES.REJECTED]: 'danger',
  [GENERATED_DOCUMENT_STATES.NEEDS_REVIEW]: 'info',
} as const

export interface StatusPillProps {
  status?: string | null
  variant?: BadgeVariant
  className?: string
  sx?: Parameters<typeof Badge>[0]['sx']
}

export function humanizeStatusLabel(status?: string | null): string {
  const normalized = status?.trim().toLowerCase() ?? ''
  if (!normalized) return 'Unknown'

  return normalized
    .split('_')
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ')
}

/** Atom: Human-readable status pill that preserves semantic status variants. */
export function StatusPill({ status, variant: variantOverride, className = '', sx }: StatusPillProps): ReactNode {
  const normalized = status?.trim().toLowerCase() ?? ''
  const variant: BadgeVariant =
    normalized === GENERATED_DOCUMENT_STATES.NEEDS_REVIEW
      ? statusVariantMap[GENERATED_DOCUMENT_STATES.NEEDS_REVIEW]
      : variantOverride ?? statusVariantMap[normalized as keyof typeof statusVariantMap] ?? 'neutral'

  return (
    <Badge className={className} variant={variant} sx={{ textTransform: 'none', ...sx }}>
      {humanizeStatusLabel(status)}
    </Badge>
  )
}
