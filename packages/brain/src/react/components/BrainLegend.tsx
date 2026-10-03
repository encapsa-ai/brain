'use client'
import { useBrain } from '../BrainProvider'
import { KindGlyph } from './Icon'
export function BrainLegend() {
  const { graph, nodeStyle, nodeSize, projection, view, selectedNodeId } = useBrain()
  const kinds = [...new Set(graph.nodes.map(node => node.kind))]
  const focused = projection.nodes.length > 120
  const edgeCount = focused ? projection.edges.filter(edge => edge.source === selectedNodeId || edge.target === selectedNodeId).length : Math.min(600, projection.edges.length)
  return <div className="brain-legend"><div className="brain-legend-kinds">{kinds.slice(0, 5).map(kind => <span key={kind}><KindGlyph style={nodeStyle(graph.nodes.find(node => node.kind === kind)!)} />{nodeStyle(graph.nodes.find(node => node.kind === kind)!).label}</span>)}</div><span className="brain-size-legend"><i /><i /><i />Size: {nodeSize.metric === 'loadedDegree' ? 'unique incident edges in loaded graph' : nodeSize.metric === 'targetTokens' ? 'target tokens' : nodeSize.metric === 'contentBytes' ? 'content bytes' : nodeSize.metric}; small = unknown</span><span className="brain-edge-disclosure">{edgeCount} / {projection.edges.length} edges shown{focused ? ' · focused' : ''} · {view.quality} quality</span></div>
}
