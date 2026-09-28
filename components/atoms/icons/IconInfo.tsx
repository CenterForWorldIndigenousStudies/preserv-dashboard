import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { IconProps } from './IconProps'

export function IconInfo({ size = 20, className = '' }: IconProps): ReactNode {
  return <Info className={className} size={size} />
}
