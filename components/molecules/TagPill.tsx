import type { ReactNode } from 'react'
import { IconX } from '@components/atoms/icons/IconX'

interface TagPillProps {
  tag: string
  onRemove: (tag: string) => void
  className?: string
}

/**
 * Molecule: Selected tag with a remove button.
 */
export function TagPill({ tag, onRemove, className = '' }: TagPillProps): ReactNode {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-moss/10 px-3 py-1 text-sm text-moss ${className}`}>
      {tag}
      <button
        onClick={() => {
          onRemove(tag)
        }}
        className="ml-1 rounded-full hover:bg-moss/20"
        aria-label={`Remove ${tag}`}
      >
        <IconX size={12} />
      </button>
    </span>
  )
}
