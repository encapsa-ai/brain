// src/core/identity.ts
function stableHash(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// src/core/hierarchy.ts
function metadataString(node, key) {
  if (!node.metadata || typeof node.metadata !== "object" || Array.isArray(node.metadata)) return void 0;
  const value = node.metadata[key];
  return typeof value === "string" ? value : void 0;
}

// src/layout/brain-layout.ts
var anchors = [[-1.55, 0.85, 0.45], [-1.8, -0.2, 0.45], [-1, -1.15, 0.45], [1.15, 1.1, 0.5], [1.9, 0.05, 0.4], [1.05, -1.1, 0.4]];
var subjects = ["org", "website", "contentmatrix_project", "user", "vertical_entity", "shareable_agent"];
function regionIndex(node) {
  const kind = metadataString(node, "subjectKind"), region = metadataString(node, "region") ?? node.sourceNamespace;
  const known = subjects.indexOf(kind ?? "");
  return known >= 0 ? known : stableHash(region) % anchors.length;
}
function boundsFor(positions) {
  const values = Object.values(positions);
  if (!values.length) return { min: [-1, -1, -1], max: [1, 1, 1] };
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const position of values) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], position[axis]);
    max[axis] = Math.max(max[axis], position[axis]);
  }
  return { min, max };
}
function brainLayout(input) {
  const positions = {};
  for (const node of input.graph.nodes) {
    if (input.signal?.aborted) throw new Error("Layout cancelled");
    const prior = input.previous?.[node.id];
    if (prior && prior.every(Number.isFinite)) {
      positions[node.id] = input.dimensions === 2 ? [prior[0], prior[1], 0] : prior;
      continue;
    }
    const anchor = node.kind === "skill" ? [1.65, -0.5, 0.15] : anchors[regionIndex(node)];
    const hash = stableHash(`${input.seed}:${node.id}`), hash2 = stableHash(`${node.id}:${input.seed}:depth`);
    const theta = hash % 10007 / 10007 * Math.PI * 2;
    const spread = node.kind === "pack" ? 0.42 : node.kind === "aggregate" ? 0.7 : 0.88;
    const radius = (0.3 + (hash >>> 12) % 997 / 997 * 0.7) * spread;
    let x = anchor[0] + Math.cos(theta) * radius;
    const y = Math.max(-1.95, Math.min(1.95, anchor[1] + Math.sin(theta) * radius));
    if (Math.abs(x) < 0.19) x = x < 0 ? -0.19 : 0.19;
    const z = input.dimensions === 2 ? 0 : (hash2 % 1009 / 1009 - 0.32) * 1.65;
    positions[node.id] = [x, y, z];
  }
  return { positions, bounds: boundsFor(positions), scopeKey: input.graph.scopeKey, revision: input.graph.revision };
}

// src/layout/cluster-layout.ts
function clusterLayout(input) {
  const positions = {};
  for (const node of input.graph.nodes) {
    if (input.signal?.aborted) throw new Error("Layout cancelled");
    if (input.previous?.[node.id]) {
      const p = input.previous[node.id];
      positions[node.id] = [p[0], p[1], input.dimensions === 2 ? 0 : p[2]];
      continue;
    }
    const region = regionIndex(node), angle = region * Math.PI / 3 - Math.PI / 2;
    const hash = stableHash(`${input.seed}:${node.id}`), theta = hash % 10007 / 10007 * Math.PI * 2;
    const r = node.kind === "pack" ? 0.25 : 0.4 + (hash >>> 12) % 997 / 997 * 0.68;
    positions[node.id] = [Math.cos(angle) * 2.25 + Math.cos(theta) * r, Math.sin(angle) * 2 + Math.sin(theta) * r, input.dimensions === 3 ? (hash >>> 20) % 100 / 100 - 0.5 : 0];
  }
  return { positions, bounds: boundsFor(positions), scopeKey: input.graph.scopeKey, revision: input.graph.revision };
}

// src/layout/layout.worker.ts
var worker = globalThis;
worker.onmessage = ({ data }) => {
  if (data.protocol !== 1) return;
  const result = (data.kind === "brain" ? brainLayout : clusterLayout)(data.input);
  worker.postMessage({ protocol: 1, requestId: data.requestId, result });
};
