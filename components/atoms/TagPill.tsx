import type { ReactElement } from 'react'

import { ValuePill } from '@atoms/ValuePill'

interface TagPillProps {
  tag: string
  onRemove: (tag: string) => void
  className?: string
}

/**
 * Atom: Selected tag with a remove button.
 */
export function TagPill({ tag, onRemove, className = '' }: TagPillProps): ReactElement {
  return <ValuePill value={tag} className={className} onRemove={() => onRemove(tag)} />
}
