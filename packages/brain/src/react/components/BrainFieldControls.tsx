'use client'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useBrainContext } from '../BrainProvider'
import { Icon } from './Icon'

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function FieldPopover({ anchor, role, id, children, onClose, focusFirst = false, onEnter, onLeave }: {
  anchor: RefObject<HTMLButtonElement | null>; role: 'menu' | 'tooltip'; id: string; children: ReactNode
  onClose: () => void; focusFirst?: boolean; onEnter?: () => void; onLeave?: () => void
}) {
  const [portal, setPortal] = useState<HTMLElement | null>(null), content = useRef<HTMLDivElement>(null)
  const didFocus = useRef(false)
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null)
  useClientLayoutEffect(() => { setPortal(anchor.current?.closest<HTMLElement>('.brain-explorer') ?? document.body) }, [anchor])
  useClientLayoutEffect(() => {
    const trigger = anchor.current, element = content.current
    if (!portal || !trigger || !element) return
    const place = () => {
      const a = trigger.getBoundingClientRect(), p = portal.getBoundingClientRect()
      const body = portal === document.body, width = body ? window.innerWidth : portal.clientWidth, height = body ? window.innerHeight : portal.clientHeight
      const x = a.left - (body ? 0 : p.left), y = a.top - (body ? 0 : p.top)
      const w = Math.max(1, Math.min(role === 'tooltip' ? 360 : Math.max(200, a.width), width - 24))
      const h = element.getBoundingClientRect().height
      const top = y + a.height + h + 8 > height ? Math.max(8, y - h - 8) : y + a.height + 8
      const next = { left: Math.max(8, Math.min(x, width - w - 8)) + (body ? window.scrollX : 0), top: top + (body ? window.scrollY : 0), width: w }
      setPosition(old => old && old.left === next.left && old.top === next.top && old.width === next.width ? old : next)
    }
    place()
    const observer = new ResizeObserver(place); observer.observe(element); observer.observe(portal)
    window.addEventListener('resize', place); document.addEventListener('scroll', place, true)
    return () => { observer.disconnect(); window.removeEventListener('resize', place); document.removeEventListener('scroll', place, true) }
  }, [portal, anchor, role, focusFirst])
  useClientLayoutEffect(() => {
    if (!focusFirst || !position || didFocus.current || !content.current) return
    didFocus.current = true
    const element = content.current
    ;(element.querySelector<HTMLElement>('[aria-checked="true"]:not(:disabled)') ?? element.querySelector<HTMLElement>('button:not(:disabled)'))?.focus()
  }, [focusFirst, position])
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!anchor.current?.contains(event.target as Node) && !content.current?.contains(event.target as Node)) onClose() }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [anchor, onClose])
  if (!portal) return null
  return createPortal(<div ref={content} role={role} id={id} className={`brain-field-popover brain-field-${role}`}
    style={{ ...position, visibility: position ? 'visible' : 'hidden' }} onPointerEnter={onEnter} onPointerLeave={onLeave}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); anchor.current?.focus() }
      if (role !== 'menu') return
      const buttons = [...content.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
        buttons[next]?.focus()
      }
      if (event.key === 'Tab') onClose()
    }}>{children}</div>, portal)
}

export interface BrainPickerOption<T extends string = string> { value: T; label: string; icon?: ReactNode; disabled?: boolean }
export function BrainPicker<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly BrainPickerOption<T>[]; onChange: (value: T) => void
}) {
  const [open, setOpen] = useState(false), anchor = useRef<HTMLButtonElement>(null), id = useId()
  const close = useCallback(() => setOpen(false), [])
  const selected = options.find(option => option.value === value)
  return <div className="brain-picker"><span className="brain-picker-label">{label}</span>
    <button ref={anchor} type="button" className="brain-picker-trigger" aria-label={`${label}: ${selected?.label ?? ''}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setOpen(!open)} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true) } }}>
      {selected?.icon}<span>{selected?.label ?? label}</span><Icon name="down" />
    </button>
    {open && <FieldPopover anchor={anchor} role="menu" id={id} onClose={close} focusFirst>{options.map(option =>
      <button key={option.value} type="button" role="menuitemradio" aria-checked={value === option.value} disabled={option.disabled}
        onClick={() => { onChange(option.value); close(); anchor.current?.focus() }}>{option.icon}<span>{option.label}</span>{value === option.value && <Icon name="check" />}</button>)}</FieldPopover>}
  </div>
}

export function BrainConnectionPicker({ label = 'Connections', labels = ['All items', 'Direct connections', 'Within two connections'] }: {
  label?: string; labels?: readonly [string, string, string]
}) {
  const { store } = useBrainContext()
  const { filters, selectedNodeId } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return <BrainPicker label={label} value={String(filters.neighborhood) as '0' | '1' | '2'} options={[
    { value: '0', label: labels[0], icon: <Icon name="layers" /> },
    { value: '1', label: labels[1], icon: <Icon name="link" />, disabled: !selectedNodeId },
    { value: '2', label: labels[2], icon: <Icon name="share" />, disabled: !selectedNodeId },
  ]} onChange={value => store.setFilters({ ...filters, neighborhood: Number(value) as 0 | 1 | 2 })} />
}

export function BrainCopyField({ value, label = 'Source field' }: { value: string; label?: string }) {
  const anchor = useRef<HTMLButtonElement>(null), id = useId(), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), generation = useRef(0)
  const [open, setOpen] = useState(false), [feedback, setFeedback] = useState('')
  const close = useCallback(() => setOpen(false), [])
  const show = () => { clearTimeout(timer.current); setOpen(true) }
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => { if (document.activeElement !== anchor.current) close() }, 120) }
  useEffect(() => { setFeedback(''); setOpen(false); return () => { generation.current++; clearTimeout(timer.current) } }, [value])
  async function copy() {
    const request = ++generation.current
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      if (request === generation.current) setFeedback('Copied')
    } catch { if (request === generation.current) setFeedback('Copy unavailable. Select the full field to copy it.') }
  }
  return <div className="brain-copy-field">
    <button ref={anchor} type="button" aria-label={`Copy ${label.toLocaleLowerCase()}: ${value}`} aria-describedby={open ? id : undefined}
      onPointerEnter={show} onPointerLeave={hide} onFocus={show} onBlur={hide} onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close() } }} onClick={() => { show(); void copy() }}>{value}</button>
    {open && <FieldPopover anchor={anchor} role="tooltip" id={id} onClose={close} onEnter={show} onLeave={hide}><span>{value}</span><small>Click the field to copy</small></FieldPopover>}
    <span className="brain-copy-feedback" role="status">{feedback}</span>
  </div>
}
