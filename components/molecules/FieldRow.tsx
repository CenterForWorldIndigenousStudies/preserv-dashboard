import type { ReactNode } from 'react'

interface FieldRowProps {
  label: string
  children: ReactNode
  className?: string
}

/**
 * Molecule: Label + value pair for document detail pages.
 */
export function FieldRow({ label, children, className = '' }: FieldRowProps): ReactNode {
  return (
    <div className={`rounded-xl bg-sand/45 p-4 ${className}`}>
      <dt className="text-xs uppercase tracking-[0.15em] text-ink/60">{label}</dt>
      <dd className="mt-2 break-words text-sm text-ink">{children}</dd>
    </div>
  )
}
