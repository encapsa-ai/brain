'use client'
import { useRef, useState } from 'react'
import { BrainExplorer, BrainPreview } from '@encapsa-dev/brain'
import { forgePreset } from '@encapsa-dev/brain/adapters/forge'
import { acmeGraph } from '../fixtures/acme'
import './dashboard-embed.css'

const loadWebGLRenderer = () => import('@encapsa-dev/brain/webgl')

/** Synthetic host-layout proof, not a copy of or connection to the CMS. */
export function DashboardEmbedDemo() {
  const [tab, setTab] = useState('content')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const brainTab = useRef<HTMLButtonElement>(null)
  const openBrain = () => { setTab('brain'); brainTab.current?.focus() }
  return <main className="embed-demo" data-theme={theme}>
    <aside className="embed-sidebar">
      <a href="../" className="embed-brand">Encapsa Brain</a>
      <p className="embed-note">Synthetic dashboard integration</p>
      <BrainPreview graph={acmeGraph} preset={forgePreset} onExpand={openBrain}
        expandLabel="Open Brain tab" theme={theme} style={{ height: 168 }} />
      <h2>Connected sources</h2>
      <p>Acme Studio website</p><p>Brand guide</p><p>Market analysis</p>
      <h2>Shared components</h2>
      <p>Navigation</p><p>Footer</p><p>Scripts</p><p>Schema</p>
    </aside>
    <section className="embed-main" aria-label="Dashboard content">
      <header className="embed-header">
        <span>Site Content Assistant</span>
        <div role="tablist" aria-label="Dashboard view">
          {['content', 'conversation', 'brain'].map(value => <button
            ref={value === 'brain' ? brainTab : undefined} key={value} type="button"
            role="tab" id={`host-tab-${value}`} aria-selected={tab === value}
            aria-controls={`host-panel-${value}`} tabIndex={tab === value ? 0 : -1}
            onKeyDown={event => {
              const values = ['content', 'conversation', 'brain']
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (values.indexOf(value) + (event.key === 'ArrowRight' ? 1 : 2)) % 3
              setTab(values[next])
              document.getElementById(`host-tab-${values[next]}`)?.focus()
            }}
            onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
        </div>
        <button className="embed-theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Use {theme === 'light' ? 'dark' : 'light'} theme</button>
      </header>
      <div className="embed-content" role="tabpanel" id={`host-panel-${tab}`} aria-labelledby={`host-tab-${tab}`}>
        {tab === 'brain' ? <BrainExplorer graph={acmeGraph} preset={forgePreset} variant="embedded"
          renderer="auto" loadWebGLRenderer={loadWebGLRenderer} theme={theme} showContextTray={false}
          defaultNavigatorOpen={false} /> : tab === 'content' ? <div className="embed-table"><h1>Pages</h1>
          {['Home', 'About Acme Studio', 'Services', 'Resources', 'Contact'].map(label => <div key={label}>{label}<span>Published</span></div>)}
          <p>Use the preview’s Expand button or the Brain tab. This example uses local fictional data only.</p>
        </div> : <div className="embed-table"><h1>Conversation</h1><p>The host owns this tab. The library does not send messages or call an AI service.</p></div>}
      </div>
      <footer className="embed-composer">Host composer area remains outside the visualization</footer>
    </section>
    <aside className="embed-insights"><h2>Traffic data</h2><p>Host-owned analytics panel</p><p>No live metrics loaded</p></aside>
  </main>
}
