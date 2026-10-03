'use client'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
export { useBrain, useBrainContext, useBrainLayout, useReducedMotion } from './BrainProvider'
export function useExplorerFullscreen(ref: RefObject<HTMLElement | null>) {
  const [mode, setMode] = useState<'none' | 'native' | 'overlay'>('none')
  const previousFocus = useRef<HTMLElement | null>(null)
  const exit = useCallback(async () => { if (document.fullscreenElement === ref.current) { try { await document.exitFullscreen() } catch { setMode('none') } } else setMode('none') }, [ref])
  const enter = useCallback(async (overlayOnly = false) => {
    const element = ref.current
    if (!element) return
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!overlayOnly && typeof element.requestFullscreen === 'function' && document.fullscreenEnabled) {
      try {
        await element.requestFullscreen()
        setMode('native')
        if (document.activeElement === previousFocus.current || !element.contains(document.activeElement)) element.focus()
        return
      } catch { /* Embedded permissions can prohibit native fullscreen; the overlay remains honest. */ }
    }
    setMode('overlay'); element.focus()
  }, [ref])
  useEffect(() => {
    const changed = () => { if (document.fullscreenElement === ref.current) setMode('native'); else setMode(current => current === 'native' ? 'none' : current) }
    document.addEventListener('fullscreenchange', changed)
    return () => document.removeEventListener('fullscreenchange', changed)
  }, [ref])
  useEffect(() => {
    if (mode === 'none') return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const root = ref.current
    const trap = (event: KeyboardEvent) => {
      if (mode !== 'overlay' || event.key !== 'Tab' || !root) return
      const items = [...root.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,a[href],[tabindex="0"]')].filter(element => element.getClientRects().length)
      const first = items[0], last = items.at(-1)
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) { event.preventDefault(); last?.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    root?.addEventListener('keydown', trap)
    return () => { document.body.style.overflow = previousOverflow; root?.removeEventListener('keydown', trap); if (previousFocus.current?.isConnected) previousFocus.current.focus() }
  }, [mode, ref])
  return { mode, enter, exit }
}
