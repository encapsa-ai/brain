import type { ReactNode } from 'react'
export interface ViewportRendererProps {
  readonly width: number
  readonly height: number
  readonly active: boolean
  readonly onReady?: () => void
  readonly onFailure?: (category: 'initialization' | 'context-lost' | 'slow-frames') => void
  readonly renderExtra?: () => ReactNode
}
