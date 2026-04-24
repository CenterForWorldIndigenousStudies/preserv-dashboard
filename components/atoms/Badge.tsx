import type { ReactNode } from 'react'

export const variantMap = {
  clay: 'bg-clay/15 text-clay',
  sky: 'bg-sky text-ink',
  moss: 'bg-moss/10 text-moss',
  sand: 'bg-sand text-ink',
}

type BadgeVariant = keyof typeof variantMap

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

/**
 * Atom: State badge pill used in DocumentTable and review status displays.
 * Represents the pill-style element: rounded-full bg-sky px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] text-ink
 */
export function Badge({ variant = 'sky', children, className = '' }: BadgeProps): ReactNode {
  const bgColor = variantMap[variant]
  const componentClass = `inline-block rounded-full ${bgColor} px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] ${className}`.trim()

  return (
    <span className={componentClass}>
      {children}
    </span>
  )
}
