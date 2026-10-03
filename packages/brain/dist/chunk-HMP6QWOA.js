"use client";

// src/core/graph-index.ts
function createGraphIndex(graph) {
  const incoming = /* @__PURE__ */ new Map(), outgoing = /* @__PURE__ */ new Map();
  for (const node of graph.nodes) {
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
  }
  for (const edge of graph.edges) {
    incoming.get(edge.target)?.push(edge);
    outgoing.get(edge.source)?.push(edge);
    if (!edge.directed && edge.source !== edge.target) {
      incoming.get(edge.source)?.push(edge);
      outgoing.get(edge.target)?.push(edge);
    }
  }
  return { nodes: new Map(graph.nodes.map((node) => [node.id, node])), incoming, outgoing };
}
function neighborhood(index, id, hops) {
  const seen = /* @__PURE__ */ new Set([id]);
  let frontier = [id];
  for (let depth = 0; depth < hops; depth++) {
    const next = [];
    for (const nodeId of frontier) for (const edge of [...index.incoming.get(nodeId) ?? [], ...index.outgoing.get(nodeId) ?? []]) {
      const other = edge.source === nodeId ? edge.target : edge.source;
      if (!seen.has(other)) {
        seen.add(other);
        next.push(other);
      }
    }
    frontier = next;
  }
  return seen;
}
function findDirectedPath(index, from, to) {
  if (!index.nodes.has(from) || !index.nodes.has(to)) return null;
  const queue = [from], seen = /* @__PURE__ */ new Set([from]), via = /* @__PURE__ */ new Map();
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (current === to) {
      const result = [];
      let cursor = to;
      while (cursor !== from) {
        const step = via.get(cursor);
        result.unshift(step.edge);
        cursor = step.previous;
      }
      return result;
    }
    for (const edge of index.outgoing.get(current) ?? []) {
      const next = edge.source === current ? edge.target : edge.source;
      if (!seen.has(next)) {
        seen.add(next);
        via.set(next, { previous: current, edge });
        queue.push(next);
      }
    }
  }
  return null;
}
function loadedDegree(index, id) {
  return new Set([...index.incoming.get(id) ?? [], ...index.outgoing.get(id) ?? []].map((edge) => edge.id)).size;
}

// src/react/BrainProvider.tsx
import { createContext, useContext, useEffect, useLayoutEffect as useReactLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

// src/core/validation.ts
function hasDirectedCycle(pairs) {
  const children = /* @__PURE__ */ new Map();
  const indegree = /* @__PURE__ */ new Map();
  for (const [source, target] of pairs) {
    children.set(source, [...children.get(source) ?? [], target]);
    indegree.set(source, indegree.get(source) ?? 0);
    indegree.set(target, (indegree.get(target) ?? 0) + 1);
  }
  const queue = [...indegree].filter(([, n]) => n === 0).map(([id]) => id);
  let visited = 0;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    visited++;
    for (const target of children.get(queue[cursor]) ?? []) {
      const remaining = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, remaining);
      if (remaining === 0) queue.push(target);
    }
  }
  return visited !== indegree.size;
}
function validateGraph(graph) {
  const counts = /* @__PURE__ */ new Map();
  const add = (code) => counts.set(code, (counts.get(code) ?? 0) + 1);
  if (graph.schemaVersion !== "1" || !graph.scopeKey || !graph.revision) add("invalid-graph");
  const ids = /* @__PURE__ */ new Set();
  for (const node of graph.nodes) {
    if (!node.id || !node.kind || !node.sourceNamespace || typeof node.label !== "string") add("invalid-node");
    if (ids.has(node.id)) add("duplicate-node");
    ids.add(node.id);
    if (node.metrics && Object.values(node.metrics).some((value) => value !== null && !Number.isFinite(value))) add("invalid-node");
  }
  const edges = /* @__PURE__ */ new Set();
  for (const edge of graph.edges) {
    if (edges.has(edge.id)) add("duplicate-edge");
    edges.add(edge.id);
    if (!ids.has(edge.source) || !ids.has(edge.target)) add("dangling-edge");
  }
  if (hasDirectedCycle(graph.edges.filter((edge) => edge.kind === "contains").map((edge) => [edge.source, edge.target]))) add("containment-cycle");
  return [...counts].map(([code, count]) => ({ code, count, severity: "error" }));
}
function validateHierarchy(graph, hierarchy) {
  const groupIds = new Set(hierarchy.groups.map((group) => group.id));
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const invalid = hierarchy.memberships.filter((member) => !groupIds.has(member.groupId) || !nodeIds.has(member.nodeId)).length + hierarchy.groups.filter((group) => group.parentGroupId && !groupIds.has(group.parentGroupId)).length + hierarchy.groups.length - groupIds.size;
  const result = invalid ? [{ code: "invalid-membership", count: invalid, severity: "error" }] : [];
  if (hasDirectedCycle(hierarchy.groups.filter((group) => group.parentGroupId).map((group) => [group.parentGroupId, group.id]))) result.push({ code: "containment-cycle", count: 1, severity: "error" });
  return result;
}

// src/core/store.ts
var BrainDataError = class extends Error {
  category;
  constructor(category) {
    super("Authorized data unavailable");
    this.name = "BrainDataError";
    this.category = category;
  }
};
var defaultFilters = { query: "", kinds: [], neighborhood: 0, groupId: null };
var defaultView = { renderer: "auto", layout: "brain", quality: "high" };
function createBrainStore(initialGraph, initial = {}) {
  let options = initial;
  const diagnostics = validateGraph(initialGraph);
  let snapshot = {
    graph: diagnostics.length ? { ...initialGraph, nodes: [], edges: [] } : initialGraph,
    selectedNodeId: initial.selectedNodeId ?? null,
    selectedEdgeId: null,
    expandedGroups: initial.expandedGroups ?? [],
    filters: initial.filters ?? defaultFilters,
    view: initial.view ?? defaultView,
    tray: [],
    observation: null,
    details: { status: "idle" },
    diagnostics,
    dataStatus: diagnostics.length ? "unavailable" : "ready"
  };
  const listeners = /* @__PURE__ */ new Set();
  let detailAbort = null, graphAbort = null;
  let detailGeneration = 0, graphGeneration = 0, disposed = false;
  let unsubscribe;
  const emit = (patch) => {
    if (disposed) return;
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };
  const invalidateDetails = () => {
    detailAbort?.abort();
    detailAbort = null;
    detailGeneration++;
  };
  async function requestDetails(nodeId) {
    invalidateDetails();
    const loader = options.onRequestDetails;
    if (!loader || !snapshot.graph.nodes.some((node) => node.id === nodeId)) {
      emit({ details: { status: "unavailable" } });
      return;
    }
    const generation = detailGeneration, { scopeKey, revision: graphRevision } = snapshot.graph;
    const controller = new AbortController();
    detailAbort = controller;
    emit({ details: { status: "loading" } });
    try {
      const value = await loader({ nodeId, scopeKey, graphRevision, signal: controller.signal });
      if (disposed || controller.signal.aborted || generation !== detailGeneration || snapshot.selectedNodeId !== nodeId || snapshot.graph.scopeKey !== scopeKey || snapshot.graph.revision !== graphRevision) return;
      if (value.scopeKey !== scopeKey) {
        failClosed(scopeKey);
        return;
      }
      if (value.graphRevision !== graphRevision || value.nodeId !== nodeId) {
        emit({ details: { status: "unavailable" } });
        return;
      }
      emit({ details: { status: "ready", value } });
    } catch (error) {
      if (!disposed && generation === detailGeneration) {
        if (error instanceof BrainDataError && error.category !== "unavailable") failClosed(scopeKey);
        else emit({ details: { status: "unavailable" } });
      }
    }
  }
  function select(nodeId, external = false) {
    if (!external && options.selectedNodeId !== void 0) {
      options.onSelectedNodeChange?.(nodeId);
      return;
    }
    invalidateDetails();
    emit({ selectedNodeId: nodeId, selectedEdgeId: null, details: { status: "idle" } });
    if (!external) options.onSelectedNodeChange?.(nodeId);
    if (nodeId) void requestDetails(nodeId);
  }
  function applyGraph(graph) {
    const scopeChanged = graph.scopeKey !== snapshot.graph.scopeKey;
    const revisionChanged = graph.revision !== snapshot.graph.revision;
    const diagnostics2 = validateGraph(graph);
    const resetContext = scopeChanged || diagnostics2.length > 0;
    invalidateDetails();
    const safeGraph = diagnostics2.length ? { ...graph, nodes: [], edges: [] } : graph;
    emit({
      graph: safeGraph,
      diagnostics: diagnostics2,
      dataStatus: diagnostics2.length ? "unavailable" : "ready",
      details: { status: "idle" },
      ...resetContext ? { selectedNodeId: null, selectedEdgeId: null, filters: defaultFilters, tray: [], expandedGroups: [], observation: null, details: { status: "idle" } } : {},
      ...revisionChanged && !resetContext ? { details: { status: "idle" }, selectedEdgeId: null, tray: snapshot.tray.filter((id) => safeGraph.nodes.some((node) => node.id === id)) } : {}
    });
    if (resetContext) options.onSelectedNodeChange?.(null);
    return diagnostics2.length === 0;
  }
  function replaceGraph(graph) {
    graphAbort?.abort();
    graphAbort = null;
    graphGeneration++;
    unsubscribe?.();
    unsubscribe = void 0;
    applyGraph(graph);
  }
  function failClosed(scopeKey) {
    invalidateDetails();
    graphAbort?.abort();
    graphGeneration++;
    unsubscribe?.();
    unsubscribe = void 0;
    emit({ graph: { schemaVersion: "1", scopeKey, revision: "unavailable", nodes: [], edges: [], completeness: "partial" }, selectedNodeId: null, selectedEdgeId: null, filters: defaultFilters, expandedGroups: [], tray: [], observation: null, details: { status: "unavailable" }, dataStatus: "unavailable" });
    options.onSelectedNodeChange?.(null);
  }
  async function loadGraph(source, scopeKey, cursor) {
    graphAbort?.abort();
    unsubscribe?.();
    unsubscribe = void 0;
    const generation = ++graphGeneration, controller = new AbortController();
    graphAbort = controller;
    if (snapshot.graph.scopeKey !== scopeKey) {
      invalidateDetails();
      emit({ graph: { schemaVersion: "1", scopeKey, revision: "loading", nodes: [], edges: [], completeness: "partial" }, selectedNodeId: null, selectedEdgeId: null, filters: defaultFilters, expandedGroups: [], tray: [], observation: null, details: { status: "idle" } });
    }
    emit({ dataStatus: "loading" });
    try {
      const graph = await source.loadGraph({ scopeKey, cursor, signal: controller.signal });
      if (disposed || controller.signal.aborted || generation !== graphGeneration) return;
      if (graph.scopeKey !== scopeKey) {
        failClosed(scopeKey);
        return;
      }
      if (!applyGraph(graph)) return;
      let sequence = -1;
      const stop = source.subscribe?.({ scopeKey, onRevision(next, nextSequence) {
        if (disposed || generation !== graphGeneration || snapshot.graph.scopeKey !== scopeKey || !Number.isSafeInteger(nextSequence) || nextSequence <= sequence) return;
        if (next.scopeKey !== scopeKey) {
          failClosed(scopeKey);
          return;
        }
        sequence = nextSequence;
        if (!applyGraph(next)) failClosed(scopeKey);
      } });
      if (generation === graphGeneration && !disposed) unsubscribe = stop;
      else stop?.();
    } catch {
      if (!disposed && generation === graphGeneration) failClosed(scopeKey);
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure(next) {
      options = next;
    },
    replaceGraph,
    select,
    requestDetails,
    loadGraph,
    failClosed,
    setEdge(id) {
      emit({ selectedEdgeId: id });
    },
    setExpandedGroups(ids, external = false) {
      if (!external && options.expandedGroups !== void 0) {
        options.onExpandedGroupsChange?.(ids);
        return;
      }
      ;
      emit({ expandedGroups: [...ids] });
      if (!external) options.onExpandedGroupsChange?.(ids);
    },
    setFilters(filters, external = false) {
      if (!external && options.filters !== void 0) {
        options.onFiltersChange?.(filters);
        return;
      }
      ;
      invalidateDetails();
      emit({ filters, details: { status: "idle" } });
      if (!external) options.onFiltersChange?.(filters);
    },
    setView(view, external = false) {
      if (!external && options.view !== void 0) {
        options.onViewChange?.(view);
        return;
      }
      ;
      emit({ view });
      if (!external) options.onViewChange?.(view);
    },
    setObservation(observation) {
      emit({ observation: observation?.association.scopeKey === snapshot.graph.scopeKey ? observation : null });
    },
    addToTray(id) {
      if (snapshot.graph.nodes.some((node) => node.id === id && node.canonicalRef) && !snapshot.tray.includes(id)) emit({ tray: [...snapshot.tray, id] });
    },
    removeFromTray(id) {
      emit({ tray: snapshot.tray.filter((nodeId) => nodeId !== id) });
    },
    reorderTray(id, offset) {
      const tray = [...snapshot.tray], index = tray.indexOf(id), target = index + offset;
      if (index >= 0 && target >= 0 && target < tray.length) {
        [tray[index], tray[target]] = [tray[target], tray[index]];
        emit({ tray });
      }
    },
    clearTray() {
      emit({ tray: [] });
    },
    dispose() {
      disposed = true;
      invalidateDetails();
      graphGeneration++;
      graphAbort?.abort();
      unsubscribe?.();
      unsubscribe = void 0;
      listeners.clear();
    },
    resume() {
      disposed = false;
    }
  };
}

// src/core/camera.ts
var homeCamera = { yaw: 0.16, pitch: 1.26, distance: 10.4, target: [0, 0, 0], pan: [0, 0], zoom: 1 };
var clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function createCameraBus() {
  let state = { ...homeCamera }, autoRotate = false;
  const commands = /* @__PURE__ */ new Set(), listeners = /* @__PURE__ */ new Set();
  let sequence = 0;
  return {
    get state() {
      return state;
    },
    set state(next) {
      state = next;
    },
    get autoRotate() {
      return autoRotate;
    },
    getSnapshot: () => `${sequence}:${autoRotate}`,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    onCommand(listener) {
      commands.add(listener);
      return () => {
        commands.delete(listener);
      };
    },
    send(command) {
      autoRotate = false;
      commands.forEach((listener) => listener(command));
      sequence++;
      listeners.forEach((listener) => listener());
    },
    setAutoRotate(value) {
      autoRotate = value;
      sequence++;
      listeners.forEach((listener) => listener());
    },
    pause() {
      if (autoRotate) {
        autoRotate = false;
        sequence++;
        listeners.forEach((listener) => listener());
      }
    }
  };
}
function createFrameMonitor() {
  let lastTime = null, slowWindows = 0;
  const intervals = [];
  return (time, moving) => {
    if (!moving || !Number.isFinite(time) || time < 0) {
      lastTime = null;
      return null;
    }
    const elapsed = lastTime === null ? 0 : time - lastTime;
    lastTime = time;
    if (elapsed <= 0) return null;
    intervals.push(elapsed);
    if (intervals.length < 90) return null;
    const sorted = [...intervals].sort((a, b) => a - b);
    const p50Ms = sorted[45], p95Ms = sorted[85];
    if (p95Ms > 75) slowWindows++;
    else if (p95Ms < 35) slowWindows = Math.max(0, slowWindows - 1);
    intervals.length = 0;
    return { p50Ms, p95Ms, slowWindows };
  };
}
function nodeRadius(node, options, degree) {
  const value = options.metric === "loadedDegree" ? degree : node.metrics?.[options.metric];
  if (value === null || value === void 0 || !Number.isFinite(value) || value < 0) return options.unknown ?? options.min * 0.8;
  const normalized = options.scale === "sqrt" ? Math.sqrt(value / 1600) : value / 1600;
  return clamp(options.min + normalized * (options.max - options.min), options.min, options.max);
}

// src/core/identity.ts
function namespacedId(scopeKey, sourceNamespace, resourceKey) {
  return [scopeKey, sourceNamespace, resourceKey].map(encodeURIComponent).join("::");
}
function parseForgeRef(reference, callerTenant) {
  const match = /^(pack|skill):\/\/([^\s?#]+)(?:#([^\s#?]+))?$/.exec(reference);
  if (!match || !callerTenant) return null;
  const kind = match[1];
  const versionParts = match[2].split("@");
  if (versionParts.length > 2 || versionParts.length === 2 && !versionParts[1]) return null;
  const parts = versionParts[0].split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || /[%\\]/.test(part))) return null;
  const version = versionParts[1] ?? null;
  const pageSlug = match[3] ?? null;
  let owner, subjectKind, subjectId, name;
  if (kind === "pack" && (parts.length === 3 || parts.length === 4)) {
    owner = parts.length === 4 ? parts[0] : callerTenant;
    [subjectKind, subjectId, name] = parts.slice(-3);
  } else if (kind === "skill" && parts[0] === "forge" && parts.length === 2 && !pageSlug) {
    owner = "forge";
    subjectKind = "skill-library";
    subjectId = "forge";
    name = parts[1];
  } else if (kind === "skill" && parts[0] === "tenant" && parts.length === 3 && !pageSlug) {
    owner = parts[1];
    subjectKind = "skill-library";
    subjectId = parts[1];
    name = parts[2];
  } else return null;
  const resourceKey = [kind, owner, subjectKind, subjectId, name, ...pageSlug ? ["page", pageSlug] : []].map(encodeURIComponent).join("/");
  return { kind, owner, subjectKind, subjectId, name, version, pageSlug, resourceKey };
}
function stableHash(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// src/core/hierarchy.ts
var emptyHierarchy = { groups: [], memberships: [] };
function buildHierarchy(graph, tiers, visibilityLevel = Infinity) {
  const groups = /* @__PURE__ */ new Map(), memberships = [];
  for (const node of graph.nodes) {
    let parentGroupId;
    for (const tier of [...tiers].sort((a, b) => a.order - b.order)) {
      if ((tier.minVisibilityLevel ?? 0) > visibilityLevel) continue;
      const group = tier.groupBy(node);
      if (!group) continue;
      const id = namespacedId(graph.scopeKey, tier.id, `${parentGroupId ?? ""}/${group.key}`);
      groups.set(id, { id, label: group.label, tierId: tier.id, parentGroupId });
      parentGroupId = id;
    }
    if (parentGroupId) memberships.push({ nodeId: node.id, groupId: parentGroupId });
  }
  return { groups: [...groups.values()], memberships };
}
function getHierarchy(graph, preset) {
  if (typeof preset?.hierarchy === "function") return preset.hierarchy(graph);
  return preset?.hierarchy ?? (preset?.tiers ? buildHierarchy(graph, preset.tiers) : emptyHierarchy);
}
function groupAncestors(hierarchy, groupId) {
  const groups = new Map(hierarchy.groups.map((group) => [group.id, group]));
  const ids = [], seen = /* @__PURE__ */ new Set();
  let current = groupId;
  while (current && !seen.has(current)) {
    ids.unshift(current);
    seen.add(current);
    current = groups.get(current)?.parentGroupId;
  }
  return ids;
}
function groupMembers(hierarchy, groupId) {
  return new Set(hierarchy.memberships.filter((member) => groupAncestors(hierarchy, member.groupId).includes(groupId)).map((member) => member.nodeId));
}
function metadataString(node, key) {
  if (!node.metadata || typeof node.metadata !== "object" || Array.isArray(node.metadata)) return void 0;
  const value = node.metadata[key];
  return typeof value === "string" ? value : void 0;
}
var defaultNodeKinds = {
  pack: { label: "Pack", color: "#62d9ca", shape: "hexagon", glyph: "P" },
  page: { label: "Page", color: "#84bdd6", shape: "circle", glyph: "\u2022" },
  skill: { label: "Skill", color: "#e8bd72", shape: "diamond", glyph: "S" },
  aggregate: { label: "Group", color: "#9aa7bc", shape: "square", glyph: "+" }
};
function resolveNodeStyle(kind, preset) {
  return preset?.nodeKinds?.[kind] ?? defaultNodeKinds[kind] ?? { label: kind, color: "#a6b5c6", shape: "square", glyph: "?" };
}
function resolveEdgeStyle(kind, preset) {
  return preset?.edgeKinds?.[kind] ?? ({
    contains: { label: "Contains", color: "#8b9aaa", dashed: false },
    references: { label: "References", color: "#b8a1e8", dashed: false },
    declares: { label: "Declares context", color: "#e8bd72", dashed: true },
    shared: { label: "Authorized sharing", color: "#62d9ca", dashed: true }
  }[kind] ?? { label: kind, color: "#8b9aaa", dashed: true });
}

// src/core/projection.ts
function projectGraph(graph, hierarchy, expandedGroups, filters, selectedId = null) {
  const expanded = new Set(expandedGroups), groups = new Map(hierarchy.groups.map((group) => [group.id, group]));
  const memberships = /* @__PURE__ */ new Map();
  for (const member of hierarchy.memberships) memberships.set(member.nodeId, [...memberships.get(member.nodeId) ?? [], member]);
  const neighbors = selectedId && filters.neighborhood ? neighborhood(createGraphIndex(graph), selectedId, filters.neighborhood) : null;
  const inGroup = filters.groupId ? groupMembers(hierarchy, filters.groupId) : null;
  const query = filters.query.trim().toLocaleLowerCase();
  const eligible = graph.nodes.filter((node) => (!filters.kinds.length || filters.kinds.includes(node.kind)) && (!neighbors || neighbors.has(node.id)) && (!inGroup || inGroup.has(node.id)) && (!query || `${node.label} ${node.canonicalRef ?? ""}`.toLocaleLowerCase().includes(query)));
  const nodes = [], canonicalToVisible = /* @__PURE__ */ new Map(), aggregates = /* @__PURE__ */ new Map();
  for (const node of eligible) {
    const placements = memberships.get(node.id) ?? [];
    const primary = placements.find((member) => !member.aliasId) ?? placements[0];
    const collapsed = primary ? groupAncestors(hierarchy, primary.groupId).find((id) => !expanded.has(id)) : void 0;
    if (collapsed) {
      const id = `aggregate:${collapsed}`;
      if (!aggregates.has(collapsed)) aggregates.set(collapsed, /* @__PURE__ */ new Set());
      aggregates.get(collapsed).add(node.id);
      canonicalToVisible.set(node.id, id);
    } else {
      nodes.push({ ...node, canonicalId: node.id });
      canonicalToVisible.set(node.id, node.id);
      for (const member of placements.filter((member2) => member2.aliasId)) {
        if (groupAncestors(hierarchy, member.groupId).every((id) => expanded.has(id))) nodes.push({ ...node, id: member.aliasId, canonicalId: node.id });
      }
    }
  }
  for (const [groupId, members] of aggregates) {
    const group = groups.get(groupId);
    nodes.push({ id: `aggregate:${groupId}`, label: group.label, kind: "aggregate", sourceNamespace: "presentation", groupId, memberIds: [...members], loadedCount: members.size, totalCount: group.totalCount, metrics: { loadedCount: members.size } });
  }
  const combined = /* @__PURE__ */ new Map();
  for (const edge of graph.edges) {
    const source = canonicalToVisible.get(edge.source), target = canonicalToVisible.get(edge.target);
    if (!source || !target || source === target && edge.source !== edge.target) continue;
    const summarized = source !== edge.source || target !== edge.target;
    const key = summarized ? JSON.stringify([source, target, edge.kind, edge.directed, edge.evidence.origin]) : edge.id;
    const existing = combined.get(key);
    combined.set(key, existing ? { ...existing, count: (existing.count ?? 1) + 1, originalEdgeIds: [...existing.originalEdgeIds ?? [], edge.id] } : { ...edge, id: summarized ? `summary:${key}` : edge.id, source, target, count: 1, originalEdgeIds: [edge.id] });
  }
  return { nodes, edges: [...combined.values()], canonicalToVisible, hiddenNodeCount: graph.nodes.length - eligible.length };
}

// src/layout/brain-layout.ts
var anchors = [[-1.55, 0.85, 0.45], [-1.8, -0.2, 0.45], [-1, -1.15, 0.45], [1.15, 1.1, 0.5], [1.9, 0.05, 0.4], [1.05, -1.1, 0.4]];
var subjects = ["org", "website", "contentmatrix_project", "user", "vertical_entity", "shareable_agent"];
function regionIndex(node) {
  const kind = metadataString(node, "subjectKind"), region = metadataString(node, "region") ?? node.sourceNamespace;
  const known = subjects.indexOf(kind ?? "");
  return known >= 0 ? known : stableHash(region) % anchors.length;
}
function brainSurface(u, v, hemisphere) {
  const sinV = Math.sin(v), fold = 1 + 0.055 * Math.sin(u * 9 + Math.cos(v * 6)) * Math.sin(v * 7) + 0.028 * Math.cos(u * 17 - v * 5);
  const x = hemisphere * (0.14 + sinV * (1.44 + Math.cos(u) * 1.31) * fold);
  const y = Math.cos(v) * 2.13 * fold + 0.14 * Math.sin(u * 2) * sinV;
  const z = Math.sin(u) * sinV * 1.57 * fold;
  return [x, y, z];
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
  const positions = /* @__PURE__ */ Object.create(null);
  for (const node of input.graph.nodes) {
    if (input.signal?.aborted) throw new Error("Layout cancelled");
    const prior = input.previous && Object.hasOwn(input.previous, node.id) ? input.previous[node.id] : void 0;
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
  const positions = /* @__PURE__ */ Object.create(null);
  for (const node of input.graph.nodes) {
    if (input.signal?.aborted) throw new Error("Layout cancelled");
    if (input.previous && Object.hasOwn(input.previous, node.id)) {
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

// src/layout/layout-controller.ts
function isUsableResult(result, input) {
  const finiteVector = (value) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
  return !!result && result.scopeKey === input.graph.scopeKey && result.revision === input.graph.revision && finiteVector(result.bounds?.min) && finiteVector(result.bounds?.max) && input.graph.nodes.every((node) => finiteVector(result.positions?.[node.id]));
}
function createLayoutController(options = {}) {
  let generation = 0, pending;
  return {
    async run(input, kind, custom) {
      pending?.();
      const requestId = ++generation;
      const fallback = () => (kind === "brain" ? brainLayout : clusterLayout)(input);
      if (input.signal?.aborted) return null;
      if (!custom && !options.workerFactory) return fallback();
      return new Promise((resolve) => {
        const controller = new AbortController();
        let worker, settled = false;
        const finish = (result) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          controller.abort();
          worker?.terminate();
          input.signal?.removeEventListener("abort", cancel);
          if (pending === cancel) pending = void 0;
          resolve(requestId === generation && !input.signal?.aborted ? result : null);
        };
        const cancel = () => finish(null);
        const degrade = () => {
          if (settled) return;
          if (input.signal?.aborted || requestId !== generation) {
            finish(null);
            return;
          }
          options.onFallback?.();
          finish(fallback());
        };
        pending = cancel;
        input.signal?.addEventListener("abort", cancel, { once: true });
        const timer = setTimeout(degrade, options.timeoutMs ?? 1500);
        try {
          if (custom) {
            Promise.resolve(custom({ ...input, signal: controller.signal })).then((result) => {
              if (settled) return;
              if (isUsableResult(result, input)) finish(result);
              else degrade();
            }, degrade);
          } else {
            worker = options.workerFactory();
            worker.onmessage = ({ data }) => {
              if (data?.protocol !== 1 || data.requestId !== requestId || data.result?.scopeKey !== input.graph.scopeKey || data.result.revision !== input.graph.revision) return;
              if (isUsableResult(data.result, input)) finish(data.result);
              else degrade();
            };
            worker.onerror = degrade;
            const { signal: _signal, ...serializable } = input;
            worker.postMessage({ protocol: 1, requestId, kind, input: serializable });
          }
        } catch {
          degrade();
        }
      });
    },
    cancel() {
      pending?.();
      generation++;
    }
  };
}

// src/react/BrainProvider.tsx
import { jsx } from "react/jsx-runtime";
var useLayoutEffect = typeof window === "undefined" ? useEffect : useReactLayoutEffect;
var Context = createContext(null);
var defaultSize = { metric: "targetTokens", scale: "sqrt", min: 4, max: 10, unknown: 3 };
function BrainProvider(props) {
  return /* @__PURE__ */ jsx(ScopedProvider, { ...props }, props.graph.scopeKey);
}
function ScopedProvider(props) {
  const { graph, preset } = props;
  const [store] = useState(() => createBrainStore(graph, { ...props, view: props.view ?? props.defaultView, selectedNodeId: graph.nodes.some((node) => node.id === (props.selectedNodeId ?? props.defaultSelectedNodeId)) ? props.selectedNodeId ?? props.defaultSelectedNodeId : null, expandedGroups: props.expandedGroups ?? props.defaultExpandedGroups ?? (graph.nodes.length > 1500 ? [] : getHierarchy(graph, preset).groups.map((group) => group.id)) }));
  const [camera] = useState(createCameraBus);
  const previousGraph = useRef(graph);
  store.configure(props);
  useLayoutEffect(() => {
    if (previousGraph.current !== graph) {
      store.replaceGraph(graph);
      previousGraph.current = graph;
    }
  }, [graph, store]);
  useLayoutEffect(() => {
    if (props.selectedNodeId !== void 0 && props.selectedNodeId !== store.getSnapshot().selectedNodeId) store.select(props.selectedNodeId, true);
  }, [props.selectedNodeId, store]);
  useLayoutEffect(() => {
    if (props.expandedGroups !== void 0 && props.expandedGroups !== store.getSnapshot().expandedGroups) store.setExpandedGroups(props.expandedGroups, true);
  }, [props.expandedGroups, store]);
  useLayoutEffect(() => {
    if (props.filters && props.filters !== store.getSnapshot().filters) store.setFilters(props.filters, true);
  }, [props.filters, store]);
  useLayoutEffect(() => {
    if (props.view && props.view !== store.getSnapshot().view) store.setView(props.view, true);
  }, [props.view, store]);
  useEffect(() => {
    store.resume();
    return () => store.dispose();
  }, [store]);
  const value = useMemo(() => ({ store, camera, preset, motion: props.motion ?? "system", autoFocus: props.autoFocus ?? true, nodeSize: props.nodeSize ?? defaultSize, layoutSeed: props.layoutSeed ?? "brain-v1", loadWebGLRenderer: props.loadWebGLRenderer, layoutAdapter: props.layoutAdapter, layoutWorkerFactory: props.layoutWorkerFactory, onDiagnostic: props.onDiagnostic, nodeStyleResolver: props.nodeStyleResolver, edgeStyleResolver: props.edgeStyleResolver, edgePattern: props.edgePattern ?? "continuous" }), [store, camera, preset, props.motion, props.autoFocus, props.nodeSize, props.layoutSeed, props.loadWebGLRenderer, props.layoutAdapter, props.layoutWorkerFactory, props.onDiagnostic, props.nodeStyleResolver, props.edgeStyleResolver, props.edgePattern]);
  return /* @__PURE__ */ jsx(Context.Provider, { value, children: props.children });
}
function useBrainContext() {
  const context = useContext(Context);
  if (!context) throw new Error("Brain components require a BrainProvider");
  return context;
}
function useBrain() {
  const context = useBrainContext();
  const snapshot = useSyncExternalStore(context.store.subscribe, context.store.getSnapshot, context.store.getSnapshot);
  const index = useMemo(() => createGraphIndex(snapshot.graph), [snapshot.graph]);
  const hierarchy = useMemo(() => getHierarchy(snapshot.graph, context.preset), [snapshot.graph, context.preset]);
  const hierarchyErrors = useMemo(() => validateHierarchy(snapshot.graph, hierarchy), [snapshot.graph, hierarchy]);
  const projection = useMemo(() => projectGraph(snapshot.graph, hierarchyErrors.length ? { groups: [], memberships: [] } : hierarchy, snapshot.expandedGroups, snapshot.filters, snapshot.selectedNodeId), [snapshot.graph, hierarchy, hierarchyErrors, snapshot.expandedGroups, snapshot.filters, snapshot.selectedNodeId]);
  const select = (id) => {
    context.camera.pause();
    const visible = projection.nodes.find((node) => node.id === id);
    if (visible?.groupId) {
      context.store.setExpandedGroups([...snapshot.expandedGroups, visible.groupId]);
      return;
    }
    const canonical = visible?.canonicalId ?? id;
    context.store.select(canonical);
    if (canonical && context.autoFocus) context.camera.send({ type: "focus", nodeIds: [canonical] });
  };
  const selectEdge = (edge) => {
    const destination = edge.target === snapshot.selectedNodeId ? edge.source : edge.target;
    const target = projection.nodes.find((node) => node.id === destination);
    if (target?.groupId) context.store.setExpandedGroups([...snapshot.expandedGroups, target.groupId]);
    context.store.select(target?.canonicalId ?? (index.nodes.has(destination) ? destination : null));
    context.store.setEdge(edge.id);
    context.camera.send({ type: "focus", nodeIds: [edge.source, edge.target] });
  };
  return {
    ...context,
    ...snapshot,
    index,
    hierarchy,
    hierarchyErrors,
    projection,
    select,
    selectEdge,
    nodeStyle: (node) => context.nodeStyleResolver?.(node, resolveNodeStyle(node.kind, context.preset)) ?? resolveNodeStyle(node.kind, context.preset),
    edgeStyle: (edge) => {
      const style = context.edgeStyleResolver?.(edge, resolveEdgeStyle(edge.kind, context.preset)) ?? resolveEdgeStyle(edge.kind, context.preset);
      return context.edgePattern === "declared" ? style : { ...style, dashed: false };
    }
  };
}
function useBrainLayout(dimensions = 3) {
  const { projection, graph, view, layoutSeed, layoutAdapter, layoutWorkerFactory, onDiagnostic } = useBrain();
  const previous = useRef(null);
  const input = useMemo(() => ({ graph: { ...graph, nodes: projection.nodes, edges: projection.edges }, seed: layoutSeed, dimensions }), [graph, projection, layoutSeed, dimensions]);
  const key = `${graph.scopeKey}:${view.layout}:${dimensions}:${layoutSeed}`;
  const bounded = useMemo(() => (view.layout === "brain" ? brainLayout : clusterLayout)({ ...input, previous: previous.current?.key === key ? previous.current.value.positions : void 0 }), [input, view.layout, key]);
  const [customResult, setCustomResult] = useState(null);
  const currentResult = customResult?.key === key && customResult.input === input ? customResult.result : bounded;
  useLayoutEffect(() => {
    previous.current = { key, value: currentResult };
  }, [key, currentResult]);
  useEffect(() => {
    if (!layoutAdapter && !layoutWorkerFactory) return;
    const controller = createLayoutController({ workerFactory: layoutWorkerFactory, onFallback: () => onDiagnostic?.({ category: "layout", value: 0 }) });
    const abort = new AbortController();
    void controller.run({ ...input, previous: previous.current?.key === key ? previous.current.value.positions : void 0, signal: abort.signal }, view.layout, layoutAdapter).then((result) => {
      if (result && !abort.signal.aborted) setCustomResult({ key, input, result });
    });
    return () => {
      abort.abort();
      controller.cancel();
    };
  }, [input, layoutAdapter, layoutWorkerFactory, view.layout, key, onDiagnostic]);
  return currentResult;
}
function useReducedMotion() {
  const { motion } = useBrainContext();
  const [system, setSystem] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setSystem(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return motion === "reduced" || motion === "system" && system;
}

// src/core/resolution.ts
function matchObservation(graph, observation) {
  if (observation.status === "failure") return [];
  return observation.sections.map((section) => {
    const unmatched = (reason) => ({ section, nodeId: null, reason });
    if (graph.scopeKey !== observation.association.scopeKey) return unmatched("scope-mismatch");
    const parsed = parseForgeRef(section.sourceRef, observation.association.callerTenant);
    const resourceKey = section.resourceKey ?? parsed?.resourceKey;
    if (!resourceKey) return unmatched("not-in-projection");
    const version = section.version ?? parsed?.version;
    if (!version) return unmatched("unknown-version");
    const candidates = graph.nodes.filter((node2) => node2.sourceNamespace === observation.association.sourceNamespace && node2.resourceKey === resourceKey);
    if (!candidates.length) return unmatched("not-in-projection");
    const node = candidates.find((node2) => node2.version === version && (!section.bodyHash || node2.contentHash === section.bodyHash));
    if (!node) return unmatched("snapshot-mismatch");
    return { section, nodeId: node.id, reason: "matched" };
  });
}
var illustrativeStages = [
  { label: "Parse", description: "Interpret caller-supplied references. This does not authorize them." },
  { label: "Policy / access", description: "The host enforces caller policy and access boundaries." },
  { label: "Reference expansion", description: "Resolve explicit references with bounded depth and cycle checks." },
  { label: "Policy checks", description: "Policy checks can recur during reference expansion; this is a conceptual grouping." },
  { label: "Redaction", description: "Where policy requires redaction, failure is fail-closed. A PHI flag alone does not establish redaction." },
  { label: "Compilation / budget", description: "Deterministic ordering and whole-section budget drops, not guessed per-node token counts." },
  { label: "Receipt", description: "Public receipts expose a subset of the internal compiler receipt. Missing evidence remains unknown." }
];

export {
  homeCamera,
  clamp,
  createFrameMonitor,
  nodeRadius,
  neighborhood,
  findDirectedPath,
  loadedDegree,
  stableHash,
  groupAncestors,
  groupMembers,
  resolveNodeStyle,
  brainSurface,
  BrainProvider,
  useBrainContext,
  useBrain,
  useBrainLayout,
  useReducedMotion,
  matchObservation,
  illustrativeStages
};
