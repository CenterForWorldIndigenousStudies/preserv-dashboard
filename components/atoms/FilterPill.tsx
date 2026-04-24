import type { ReactNode } from 'react'
import Link from 'next/link'

interface FilterPillProps {
  label: string
  isActive: boolean
  href: string
  className?: string
}

/**
 * Atom: Interactive filter pill for filter toolbars.
 * Renders a Next.js Link with active/inactive styling.
 */
export function FilterPill({ label, isActive, href, className = '' }: FilterPillProps): ReactNode {
  const activeClass = isActive ? 'bg-moss text-white' : 'bg-sand text-ink hover:bg-sky' 
  const componentClass = `rounded-full px-4 py-2 text-sm ${activeClass}${className ? ` ${className}` : ''}`
  return (
    <Link
      href={href}
      className={componentClass}
    >
      {label}
    </Link>
  )
}
