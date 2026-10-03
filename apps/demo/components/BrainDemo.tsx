'use client'
import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react'
import { BrainCircuit, Building2, BookOpen, Code2, SlidersHorizontal, ArrowUpRight, X, CircleHelp, Check } from 'lucide-react'
import { BrainProvider, BrainExplorerShell, useBrain, type ExplorerMode } from '../../../packages/brain/src/react'
import { forgePreset } from '../../../packages/brain/src/adapters/forge'
import { namespacedId, type BrainGraph, type BrainPreset, type DiagnosticEvent, type DetailsLoader, type LayoutWorkerPort } from '../../../packages/brain/src/core'
import { acmeGraph, initialNodeId, summaryGraph } from '../fixtures/acme'
import { createStressGraph, engineeringGraph, engineeringPreset } from '../fixtures/generic'
import { createScenario, scenarios, type ScenarioId } from '../fixtures/scenarios'
import { DeveloperPlayground, type PlaygroundSettings } from './DeveloperPlayground'

type Dataset = 'acme' | 'engineering' | 'summary' | 'stress100' | 'stress1000' | 'stress5000'
const initialSettings: PlaygroundSettings = { size: 'workspace', theme: 'dark', metric: 'targetTokens', forceWebGLFailure: false, forceWorkerTimeout: false, slowDetails: false, customKinds: false, diagnostics: false }
function graphFor(dataset: Dataset): BrainGraph { return dataset === 'acme' ? acmeGraph : dataset === 'summary' ? summaryGraph : dataset === 'engineering' ? engineeringGraph : createStressGraph(dataset === 'stress100' ? 100 : dataset === 'stress1000' ? 1000 : 5000) }
const loadWebGLRenderer = () => import('../../../packages/brain/src/renderers/webgl')
const stalledWorker = (): LayoutWorkerPort => ({ onmessage: null, onerror: null, postMessage() {}, terminate() {} })
export function BrainDemo() {
  const [dataset, setDataset] = useState<Dataset>('acme'), [graph, setGraph] = useState<BrainGraph>(acmeGraph)
  const [settings, setSettings] = useState(initialSettings), [playground, setPlayground] = useState(false), [docs, setDocs] = useState(false)
  const [events, setEvents] = useState<readonly DiagnosticEvent[]>([]), [notice, setNotice] = useState('')
  const counter = useRef(0)
  const onDiagnostic = useCallback((event: DiagnosticEvent) => { setEvents(previous => [...previous.slice(-11), event]); if (event.category === 'layout' && event.value === 0) setNotice('Simulated layout-worker timeout · deterministic fallback applied.') }, [])
  const preset = useMemo<BrainPreset>(() => { const base = dataset === 'acme' || dataset === 'summary' ? forgePreset : engineeringPreset; return settings.customKinds ? { ...base, nodeKinds: { ...base.nodeKinds, note: { label: 'Note', color: '#b8a1e8', shape: 'square', glyph: 'N' } } } : base }, [dataset, settings.customKinds])
  const detailsLoader = useMemo<DetailsLoader>(() => async input => {
    await new Promise<void>(resolve => setTimeout(resolve, settings.slowDetails ? 2000 : 80))
    return { ...input, fields: [{ label: 'Projection type', value: 'Authorized synthetic metadata' }, { label: 'Data source', value: 'Local fixture, no production service' }], authorizedText: 'Synthetic, explicitly authorized detail text. The renderer escapes text and does not interpret HTML or fetch remote media.' }
  }, [settings.slowDetails])
  const selectDataset = (value: Dataset) => { setDataset(value); setGraph(graphFor(value)); setNotice(''); setEvents([]) }
  const addNode = (selectedId: string | null) => {
    counter.current++
    setGraph(current => {
      const id = namespacedId(current.scopeKey, 'local-fixture', `note-${counter.current}`)
      const node = { id, kind: settings.customKinds ? 'note' : dataset === 'acme' || dataset === 'summary' ? 'page' : 'document', label: `Synthetic note ${counter.current}`, sourceNamespace: 'local-fixture', version: 'v1', metrics: { targetTokens: 420 }, metadata: { synthetic: true, region: 'Local additions', subjectKind: 'org', subjectId: 'org_acme', provenance: 'local synthetic fixture', evidence: 'User-added synthetic metadata; no backend mutation', completeness: 'metadata' } }
      return { ...current, revision: `${current.revision}-add${counter.current}`, nodes: [...current.nodes, node], edges: selectedId && current.nodes.some(item => item.id === selectedId) ? [...current.edges, { id: `local-edge-${counter.current}`, source: selectedId, target: id, kind: 'references', directed: true, evidence: { origin: 'synthetic' }, metadata: { explanation: 'An explicit local synthetic reference added in the playground.' } }] : current.edges }
    })
    setNotice('Synthetic node added locally. Existing selection and positions are preserved.')
  }
  const removeNode = (selectedId: string | null) => { if (!selectedId) return; setGraph(current => ({ ...current, revision: `${current.revision}-remove${++counter.current}`, nodes: current.nodes.filter(node => node.id !== selectedId), edges: current.edges.filter(edge => edge.source !== selectedId && edge.target !== selectedId) })); setNotice('Selected synthetic node removed locally; the inspector shows it as unavailable.') }
  const closePlayground = useCallback(() => setPlayground(false), [])
  const dimensions: CSSProperties = settings.size === 'embed' ? { width: 320, height: 240 } : settings.size === 'panel' ? { width: 'min(640px, 100%)', height: 420 } : settings.size === 'wide' ? { width: '100%', height: 'auto', aspectRatio: '16 / 9', minHeight: 420 } : { height: 'calc(100dvh - 162px)', minHeight: 540 }
  return <main className={`demo-page font-sans ${settings.theme === 'light' ? 'demo-light' : ''}`}>
    <header className="demo-header"><div className="demo-brand"><span className="demo-brand-mark"><BrainCircuit size={25} strokeWidth={1.5} /></span><h1>Brain Explorer</h1><span className="demo-version font-mono">v0.1.0</span><span className="demo-header-divider" /><code className="demo-package font-mono">@encapsa-dev/brain</code></div><div className="demo-header-actions"><span className="demo-synthetic"><span />Synthetic data</span><button className="demo-header-button" onClick={() => setDocs(true)}><BookOpen size={16} />Docs<ArrowUpRight size={14} /></button><button className="demo-header-button demo-playground-trigger" onClick={() => setPlayground(true)}><Code2 size={17} />Playground</button></div></header>
    <div className="demo-workspace-heading"><div><span className="demo-section-label">WORKSPACE</span><span className="demo-heading-divider">/</span><span>Context explorer</span></div><span className="demo-local-note"><Check size={14} />Runs locally. Your context stays yours.</span></div>
    <div className={`demo-explorer-container demo-size-${settings.size}`}>
      <BrainProvider graph={graph} preset={preset} loadWebGLRenderer={loadWebGLRenderer} defaultSelectedNodeId={dataset === 'acme' ? initialNodeId : null} onRequestDetails={detailsLoader} nodeSize={{ metric: settings.metric, scale: 'sqrt', min: 4, max: 10, unknown: 3 }} layoutWorkerFactory={settings.forceWorkerTimeout ? stalledWorker : undefined} onDiagnostic={settings.diagnostics || settings.forceWorkerTimeout ? onDiagnostic : undefined}>
        <DemoWorkspace dataset={dataset} setDataset={selectDataset} settings={settings} setSettings={setSettings} dimensions={dimensions} playground={playground} closePlayground={closePlayground} openPlayground={() => setPlayground(true)} onAdd={addNode} onRemove={removeNode} onReset={() => { setGraph(graphFor(dataset)); setNotice('Synthetic fixture reset.'); counter.current = 0 }} events={events} />
      </BrainProvider>
    </div>
    <footer className="demo-footer"><span>{notice || 'A new perspective on the context you already have.'}</span><button onClick={() => setDocs(true)}><CircleHelp size={14} />About this visualization</button></footer>
    {docs && <DocsDialog onClose={() => setDocs(false)} />}
  </main>
}
function DemoWorkspace({ dataset, setDataset, settings, setSettings, dimensions, playground, closePlayground, openPlayground, onAdd, onRemove, onReset, events }: { dataset: Dataset; setDataset: (dataset: Dataset) => void; settings: PlaygroundSettings; setSettings: (settings: PlaygroundSettings) => void; dimensions: CSSProperties; playground: boolean; closePlayground: () => void; openPlayground: () => void; onAdd: (id: string | null) => void; onRemove: (id: string | null) => void; onReset: () => void; events: readonly DiagnosticEvent[] }) {
  const { store, selectedNodeId } = useBrain(), [mode, setMode] = useState<ExplorerMode>('inventory'), [scenario, setScenario] = useState<ScenarioId>('included')
  const forge = dataset === 'acme' || dataset === 'summary'
  return <BrainExplorerShell style={dimensions} theme={settings.theme} mode={mode} onModeChange={setMode} forceWebGLFailure={settings.forceWebGLFailure} simulated
    toolbarStart={<label className="demo-dataset-picker"><Building2 size={17} /><span className="brain-sr-only">Dataset</span><select aria-label="Dataset" value={dataset} onChange={event => { setDataset(event.target.value as Dataset); setMode('inventory') }}><option value="acme">Acme Studio</option><option value="summary">Acme · summaries only</option><option value="engineering">Engineering handbook</option><option value="stress100">Stress · 100 nodes</option><option value="stress1000">Stress · 1,000 nodes</option><option value="stress5000">Stress · 5,000 nodes (LOD)</option></select><span className="demo-dataset-tag">DEMO</span></label>}
    toolbarEnd={<button className="brain-icon-button" aria-label="Open developer playground" title="Developer playground" onClick={openPlayground}><SlidersHorizontal size={17} /></button>}
    onPreview={forge ? refs => { store.setObservation(createScenario(scenario, refs)); setMode('receipt') } : undefined}
    previewLabel="Preview composition"
    receiptControls={forge ? <div className="brain-field"><label htmlFor="demo-scenario">Synthetic scenario</label><select id="demo-scenario" value={scenario} onChange={event => { const value = event.target.value as ScenarioId; setScenario(value); store.setObservation(createScenario(value)) }}><option value="included">Included context</option>{scenarios.filter(item => item.id !== 'included').map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button className="brain-button" onClick={() => store.setObservation(createScenario(scenario))}>Apply simulated observation</button><p className="brain-help">{scenarios.find(item => item.id === scenario)?.description}</p></div> : <p className="brain-help">Forge receipt scenarios apply to the Acme fixture. The generic library has no Forge dependency.</p>}
  >{playground && <DeveloperPlayground settings={settings} onChange={setSettings} onClose={closePlayground} onAdd={() => onAdd(selectedNodeId)} onRemove={() => onRemove(selectedNodeId)} onReset={() => { onReset(); store.select(forge ? initialNodeId : null); store.setObservation(null); store.clearTray() }} events={events} />}</BrainExplorerShell>
}
function DocsDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  return <dialog className="demo-docs" ref={element => { ref.current = element; if (element && !element.open) element.showModal() }} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }} aria-labelledby="demo-docs-title"><div className="demo-docs-inner"><div className="demo-modal-heading"><span><BookOpen size={18} /><h2 id="demo-docs-title">A brain for your context</h2></span><button className="demo-header-button" aria-label="Close documentation" onClick={onClose}><X size={19} /></button></div><div className="demo-docs-content"><p><strong>Brain Explorer</strong> is a working, offline demonstration of <code>@encapsa-dev/brain</code>. It visualizes already-authorized knowledge; it is not a graph database, resolver, or authorization layer.</p><h3>Explore</h3><p>Drag the 3D canvas to orbit. Scroll or pinch to zoom; right-drag to pan. The lower toolbar and arrow keys rotate in discrete steps. Click a node to inspect it. Follow relationship rows to focus directed edges and their endpoints.</p><h3>Three independent tiers</h3><p>Knowledge hierarchy controls grouping. Resolution observations describe evidence-backed outcomes. Renderer tiers choose WebGL, 2D, or a semantic list. None changes the underlying canonical graph.</p><h3>Small, explicit entry points</h3><pre className="font-mono">{'@encapsa-dev/brain\n@encapsa-dev/brain/core\n@encapsa-dev/brain/react\n@encapsa-dev/brain/webgl\n@encapsa-dev/brain/adapters/forge\n@encapsa-dev/brain/styles.css'}</pre><h3>Try the playground</h3><p>Resize to a 320 × 240 embed, switch to a generic engineering dataset, add synthetic nodes, choose a metric, or simulate renderer and layout failures. Search is local label/reference matching, not semantic search.</p><h3>Evidence, not inference</h3><p>All fixtures are fictional. A PHI flag is not redaction evidence. Public receipts do not expose full internal per-source records. Unknown stays unknown; historical versions must match exactly. Every demonstration receipt is marked Simulated.</p><h3>Release status</h3><p>Source and package build are prepared for review. No npm publication, repository creation, production integration, or license approval is implied. MIT is recommended for operator review.</p></div></div></dialog>
}
