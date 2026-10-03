'use client'
import { useSyncExternalStore } from 'react'
import { useBrain, useReducedMotion } from '../BrainProvider'
import { Icon } from './Icon'
export function BrainToolbar() {
  const { camera } = useBrain(), reduced = useReducedMotion()
  useSyncExternalStore(camera.subscribe, camera.getSnapshot, camera.getSnapshot)
  const actions = [
    { label: 'Rotate left', icon: 'left' as const, action: () => camera.send({ type: 'rotate', yaw: -Math.PI / 12, pitch: 0 }) },
    { label: 'Rotate right', icon: 'right' as const, action: () => camera.send({ type: 'rotate', yaw: Math.PI / 12, pitch: 0 }) },
    { label: 'Rotate up', icon: 'up' as const, action: () => camera.send({ type: 'rotate', yaw: 0, pitch: -Math.PI / 12 }) },
    { label: 'Rotate down', icon: 'down' as const, action: () => camera.send({ type: 'rotate', yaw: 0, pitch: Math.PI / 12 }) },
  ]
  return <div className="brain-camera-toolbar" role="toolbar" aria-label="Camera controls"><div className="brain-toolbar-cluster">{actions.map(action => <button key={action.label} className="brain-icon-button" aria-label={action.label} title={action.label} onClick={action.action}><Icon name={action.icon} /></button>)}</div><span className="brain-toolbar-divider" /><div className="brain-toolbar-cluster"><button className="brain-icon-button" aria-label="Zoom in" title="Zoom in" onClick={() => camera.send({ type: 'zoom', factor: 1.18 })}><Icon name="plus" /></button><button className="brain-icon-button" aria-label="Zoom out" title="Zoom out" onClick={() => camera.send({ type: 'zoom', factor: 1 / 1.18 })}><Icon name="minus" /></button><button className="brain-icon-button" aria-label="Fit visible context" title="Fit visible context" onClick={() => camera.send({ type: 'fit' })}><Icon name="fit" /></button><button className="brain-icon-button" aria-label="Reset camera" title="Reset camera" onClick={() => camera.send({ type: 'reset' })}><Icon name="reset" /></button></div><span className="brain-toolbar-divider" /><button className="brain-auto-rotate" aria-pressed={camera.autoRotate} onClick={() => camera.setAutoRotate(!camera.autoRotate)} title={reduced ? 'Explicitly enable rotation; reduced motion disables automatic camera transitions' : 'Auto-rotate; interaction pauses it'}><Icon name={camera.autoRotate ? 'pause' : 'play'} /><span>Auto-rotate</span><span className={`brain-toggle ${camera.autoRotate ? 'is-on' : ''}`} /></button></div>
}
