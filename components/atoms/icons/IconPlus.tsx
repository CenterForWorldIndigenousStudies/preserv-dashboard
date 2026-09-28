import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { IconProps } from './IconProps'

export function IconPlus({ size = 20, className = '' }: IconProps): ReactNode {
  return <Plus className={className} size={size} />
}
