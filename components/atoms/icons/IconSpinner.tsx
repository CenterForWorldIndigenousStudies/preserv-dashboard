import type { ReactNode } from 'react'
import { IconProps } from './IconProps'

/**
 * Atom: Spinner icon using SVG.
 * Uses a fixed viewBox so it scales cleanly at any size.
 */
export function IconSpinner({ size = 20, className = '', ariaLabel = 'Loading' }: IconProps & { ariaLabel?: string }): ReactNode {
  const componentClass = `animate-spin ${className}`.trim()

  return (
    <svg
      className={componentClass}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label={ariaLabel}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
