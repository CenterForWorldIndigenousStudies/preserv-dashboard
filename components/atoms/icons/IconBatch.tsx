import type { ReactNode } from 'react'
import { Egg } from 'lucide-react'
import { IconProps } from './IconProps'

export function IconBatch({ size = 20, className = '' }: IconProps): ReactNode {
  return <Egg className={className} size={size} />
}
