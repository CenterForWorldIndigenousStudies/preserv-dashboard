import type { ReactNode } from 'react'

export interface DisplayAndString {
  display: ReactNode // renderable React node
  plainText: string // plain text for search/copy
}
