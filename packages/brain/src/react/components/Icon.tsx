import type { CSSProperties } from 'react'
import type { KindStyle } from '../../core/types'
const paths = {
  left: 'm14 6-6 6 6 6', right: 'm10 6 6 6-6 6', up: 'm6 14 6-6 6 6', down: 'm6 10 6 6 6-6',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', close: 'm6 6 12 12M6 18 18 6',
  expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5', fit: 'M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M8 12h8m-4-4v8',
  reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6', search: 'M21 21l-5-5M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  cube: 'm12 3 9 5v8l-9 5-9-5V8l9-5Zm0 9v9m-9-13 9 5 9-5M7 5l9 5', link: 'm9 15 6-6m-7 3-2 2a4 4 0 0 0 6 6l3-3m-3-9 2-2a4 4 0 0 1 6 6l-3 3',
  info: 'M12 11v6m0-10v.01M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0', check: 'm5 12 4 4L19 6',
  panel: 'M3 4h18v16H3V4Zm5 0v16', arrow: 'M4 12h16m-6-6 6 6-6 6', play: 'm7 4 14 8-14 8V4Z', pause: 'M8 5v14M16 5v14',
} as const
export function Icon({ name, className = '' }: { name: keyof typeof paths; className?: string }) {
  return <svg className={`brain-icon ${className}`} aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>
}
export function KindGlyph({ style }: { style: KindStyle }) {
  return <span className={`brain-kind-glyph brain-shape-${style.shape}`} style={{ '--kind-color': style.color } as CSSProperties} aria-hidden="true" />
}
