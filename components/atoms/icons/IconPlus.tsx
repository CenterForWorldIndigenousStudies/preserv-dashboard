import type { CSSProperties, ReactNode } from 'react'
import { IconProps } from './IconProps'

export function IconPlus({ size = 20, className = '' }: IconProps): ReactNode {
  const scale = size / 20
  const viewBox = `0 0 ${20 * scale} ${20 * scale}`
  const strokeWidth = 1.5 * scale

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={className}
      style={{ '--icon-scale': scale } as CSSProperties}
    >
      <path d={`M${10 * scale} ${4 * scale}v${12 * scale}M${4 * scale} ${10 * scale}h${12 * scale}`} />
    </svg>
  )
}
