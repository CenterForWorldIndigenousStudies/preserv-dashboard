import type { ReactNode } from 'react'

export const variantMap = {
  danger: 'bg-clay/15 text-clay',
  info: 'bg-sky text-ink',
  success: 'bg-moss/10 text-moss',
  neutral: 'bg-sand text-ink',
}

export type BadgeVariant = keyof typeof variantMap

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

/**
 * Atom: Semantic badge pill used for status and lightweight emphasis.
 * Variants represent UI intent, not fixed color names, so the palette can change
 * without forcing call sites to rename props.
 */
export function Badge({ variant = 'info', children, className = '' }: BadgeProps): ReactNode {
  const bgColor = variantMap[variant]
  const componentClass =
    `inline-block rounded-full ${bgColor} px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] ${className}`.trim()

  return <span className={componentClass}>{children}</span>
}
