'use client'
import { useEffect, useRef, type CSSProperties } from 'react'
import { BrainProvider, type BrainProviderProps } from './BrainProvider'
import { BrainViewport } from './components/BrainViewport'
import { Icon } from './components/Icon'
import type { LayoutKind, RendererKind } from '../core/types'

export interface BrainPreviewProps extends Omit<BrainProviderProps, 'children'> {
  /** The host owns expansion: select a tab, open a panel, or navigate. */
  onExpand: () => void
  expandLabel?: string
  label?: string
  className?: string
  style?: CSSProperties
  theme?: 'dark' | 'light'
  renderer?: Exclude<RendererKind, 'list'>
  layout?: LayoutKind
}

/**
 * A read-only overview with exactly one action. It does not request fullscreen
 * or take ownership of host navigation. SVG is the inexpensive default.
 */
export function BrainPreview({
  onExpand, expandLabel = 'Expand brain', label = 'Knowledge overview',
  className = '', style, theme = 'dark', renderer = 'svg', layout = 'brain',
  ...providerProps
}: BrainPreviewProps) {
  const surface = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // DOM property works with both React 18 and React 19 without React-specific
    // inert prop typing. The viewport itself also suppresses keyboard input.
    if (surface.current) surface.current.inert = true
  }, [])
  return (
    <BrainProvider {...providerProps} autoFocus={false}
      nodeSize={providerProps.nodeSize ?? { metric: 'targetTokens', scale: 'sqrt', min: 1.5, max: 3.5, unknown: 1.5 }}
      defaultView={providerProps.defaultView ?? { renderer, layout, quality: 'low' }}>
      <div className={`brain-explorer brain-preview ${className}`} data-theme={theme}
        style={style} role="region" aria-label={label}>
        <div ref={surface} className="brain-preview-surface" aria-hidden="true">
          <BrainViewport renderer={renderer} layout={layout} interactive={false} showLabels={false} />
        </div>
        <button type="button" className="brain-icon-button brain-preview-expand"
          aria-label={expandLabel} title={expandLabel} onClick={onExpand}>
          <Icon name="expand" />
        </button>
      </div>
    </BrainProvider>
  )
}
