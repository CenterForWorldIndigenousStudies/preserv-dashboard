import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconProps } from './IconProps'

export function IconX({ size = 20, className = '' }: IconProps): ReactNode {
  return <X className={className} size={size} />
}
