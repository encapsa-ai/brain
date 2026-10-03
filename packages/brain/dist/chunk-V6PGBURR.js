"use client";
import {
  BrainProvider,
  brainSurface,
  clamp,
  findDirectedPath,
  groupAncestors,
  groupMembers,
  homeCamera,
  illustrativeStages,
  loadedDegree,
  matchObservation,
  neighborhood,
  nodeRadius,
  resolveNodeStyle,
  useBrain,
  useBrainContext,
  useBrainLayout,
  useReducedMotion
} from "./chunk-HMP6QWOA.js";

// src/react/BrainExplorer.tsx
import { forwardRef, useEffect as useEffect5, useId as useId5, useImperativeHandle, useRef as useRef5, useState as useState9 } from "react";

// src/react/components/BrainViewport.tsx
import { Component, Suspense, lazy, useEffect as useEffect2, useMemo as useMemo2, useRef as useRef2, useState as useState3 } from "react";

// src/renderers/svg/BrainSvgRenderer.tsx
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
function BrainSvgRenderer({ width, height, active, interactive = true, showLabels = true }) {
  const brain = useBrain(), layout = useBrainLayout(2), markerId = useId().replaceAll(":", "");
  const { camera, projection, selectedNodeId, selectedEdgeId, index, select, selectEdge, nodeStyle, edgeStyle, nodeSize, view, observation, graph } = brain;
  const svgRef = useRef(null), groupRef = useRef(null);
  const drag = useRef(null);
  const pointers = useRef(/* @__PURE__ */ new Map()), pinchDistance = useRef(null);
  const [hover, setHover] = useState(null);
  const scale = Math.max(15, Math.min(width / 8.7, height / 6.8));
  const neighborIds = useMemo(() => selectedNodeId ? neighborhood(index, selectedNodeId, 1) : null, [index, selectedNodeId]);
  const matches = useMemo(() => observation ? matchObservation(graph, observation) : [], [graph, observation]);
  const pathFor = (side) => Array.from({ length: 90 }, (_, i) => {
    const v = i / 89 * Math.PI, p = brainSurface(side === -1 ? 0 : Math.PI * 2, v, side);
    return `${i === 0 ? "M" : "L"}${p[0] * scale},${-p[1] * scale}`;
  }).join(" ");
  function sync() {
    const s = camera.state;
    groupRef.current?.setAttribute("transform", `translate(${width / 2 + s.pan[0]},${height / 2 + s.pan[1]}) scale(${s.zoom}) rotate(${(s.yaw - homeCamera.yaw) * 180 / Math.PI})`);
  }
  useEffect(() => {
    sync();
  });
  useEffect(() => {
    if (!active || !interactive) return;
    return camera.onCommand((command) => {
      const state = camera.state;
      if (command.type === "reset") camera.state = { ...homeCamera };
      if (command.type === "fit") {
        const span = Math.max(layout.bounds.max[0] - layout.bounds.min[0], layout.bounds.max[1] - layout.bounds.min[1]);
        camera.state = { ...state, pan: [0, 0], zoom: clamp(5.3 / Math.max(2, span), 0.35, 3) };
      }
      if (command.type === "rotate") camera.state = { ...state, yaw: state.yaw + command.yaw, pitch: clamp(state.pitch + command.pitch, 0.25, Math.PI - 0.25), pan: [state.pan[0], state.pan[1] + command.pitch * 50] };
      if (command.type === "zoom") camera.state = { ...state, zoom: clamp(state.zoom * command.factor, 0.25, 5), distance: clamp(state.distance / command.factor, 3, 24) };
      if (command.type === "focus") {
        const positions = command.nodeIds.map((id) => layout.positions[projection.canonicalToVisible.get(id) ?? id]).filter(Boolean);
        if (positions.length) {
          const x = positions.reduce((sum, p) => sum + p[0], 0) / positions.length, y = positions.reduce((sum, p) => sum + p[1], 0) / positions.length;
          camera.state = { ...state, pan: [-x * scale * state.zoom * 0.35, y * scale * state.zoom * 0.35] };
        }
      }
      sync();
    });
  }, [active, interactive, camera, layout, width, height, projection, scale]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !active || !interactive) return;
    const wheel = (event) => {
      event.preventDefault();
      camera.pause();
      const factor = Math.exp(-event.deltaY * 1e-3);
      camera.state = { ...camera.state, zoom: clamp(camera.state.zoom * factor, 0.25, 5) };
      sync();
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, [active, interactive, width, height, camera]);
  useEffect(() => {
    if (!active || !interactive) return;
    let frame = 0, previous = 0;
    const run = (time) => {
      if (camera.autoRotate && !document.hidden) {
        const delta = previous ? Math.min(0.05, (time - previous) / 1e3) : 0;
        camera.state = { ...camera.state, yaw: camera.state.yaw + delta * 0.15 };
        sync();
        previous = time;
        frame = requestAnimationFrame(run);
      }
    };
    const wake = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (camera.autoRotate) frame = requestAnimationFrame(run);
    };
    const stop = camera.subscribe(wake);
    wake();
    return () => {
      stop();
      cancelAnimationFrame(frame);
    };
  }, [active, interactive, camera, width, height]);
  const selectedEdge = projection.edges.find((edge) => edge.id === selectedEdgeId || edge.originalEdgeIds?.includes(selectedEdgeId ?? ""));
  const labeled = showLabels ? projection.nodes.filter((node) => node.kind === "pack" || node.kind === "skill" || node.kind === "aggregate" || node.id === selectedNodeId || node.id === hover || selectedEdge?.source === node.id || selectedEdge?.target === node.id).slice(0, 22) : [];
  const edges = projection.edges.filter((edge) => projection.nodes.length <= 120 || edge.source === selectedNodeId || edge.target === selectedNodeId || edge.id === selectedEdgeId).slice(0, 600);
  function glyph(node, r) {
    const style = nodeStyle(node);
    if (style.shape === "diamond") return /* @__PURE__ */ jsx("polygon", { points: `0,${-r * 1.4} ${r * 1.25},0 0,${r * 1.4} ${-r * 1.25},0` });
    if (style.shape === "square") return /* @__PURE__ */ jsx("rect", { x: -r, y: -r, width: r * 2, height: r * 2, rx: "2" });
    if (style.shape === "hexagon") return /* @__PURE__ */ jsx("polygon", { points: Array.from({ length: 6 }, (_, i) => `${Math.cos(i * Math.PI / 3) * r * 1.2},${Math.sin(i * Math.PI / 3) * r * 1.2}`).join(" ") });
    return /* @__PURE__ */ jsx("circle", { r });
  }
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      ref: svgRef,
      className: "brain-svg-renderer",
      "data-renderer": "svg",
      width: Math.max(1, width),
      height: Math.max(1, height),
      viewBox: `0 0 ${Math.max(1, width)} ${Math.max(1, height)}`,
      "aria-label": "Interactive 2D knowledge graph. Drag to pan; use the accessible list for keyboard entity navigation.",
      onPointerDown: (event) => {
        camera.pause();
        pointers.current.set(event.pointerId, [event.clientX, event.clientY]);
        if (pointers.current.size === 2) {
          const values = [...pointers.current.values()];
          pinchDistance.current = Math.hypot(values[0][0] - values[1][0], values[0][1] - values[1][1]);
        }
        drag.current = { x: event.clientX, y: event.clientY, dx: camera.state.pan[0], dy: camera.state.pan[1], moved: false, pointer: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event) => {
        if (!pointers.current.has(event.pointerId)) return;
        pointers.current.set(event.pointerId, [event.clientX, event.clientY]);
        if (pointers.current.size === 2) {
          const values = [...pointers.current.values()], distance = Math.hypot(values[0][0] - values[1][0], values[0][1] - values[1][1]);
          if (pinchDistance.current) camera.state = { ...camera.state, zoom: clamp(camera.state.zoom * distance / pinchDistance.current, 0.25, 5) };
          pinchDistance.current = distance;
          if (drag.current) drag.current.moved = true;
          sync();
          return;
        }
        const start = drag.current;
        if (!start) return;
        const dx = event.clientX - start.x, dy = event.clientY - start.y;
        if (Math.hypot(dx, dy) > 5) start.moved = true;
        if (start.moved) {
          camera.state = { ...camera.state, pan: [start.dx + dx, start.dy + dy] };
          sync();
        }
      },
      onPointerUp: (event) => {
        const start = drag.current;
        pointers.current.delete(event.pointerId);
        pinchDistance.current = null;
        drag.current = null;
        if (!start || start.moved) return;
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-node-id],[data-edge-id]");
        const nodeId = target?.getAttribute("data-node-id"), edgeId = target?.getAttribute("data-edge-id");
        if (nodeId) select(nodeId);
        else if (edgeId) {
          const edge = projection.edges.find((candidate) => candidate.id === edgeId);
          if (edge) selectEdge(edge);
        } else select(null);
      },
      onPointerCancel: () => {
        drag.current = null;
        pointers.current.clear();
        pinchDistance.current = null;
      },
      children: [
        /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsx("marker", { id: markerId, markerWidth: "7", markerHeight: "7", refX: "12", refY: "3.5", orient: "auto", markerUnits: "userSpaceOnUse", children: /* @__PURE__ */ jsx("path", { d: "M0,0 L7,3.5 L0,7 Z", fill: "context-stroke" }) }) }),
        /* @__PURE__ */ jsxs("g", { ref: groupRef, children: [
          view.layout === "brain" && /* @__PURE__ */ jsxs("g", { className: "brain-svg-contours", "aria-hidden": "true", children: [
            [-1, 1].map((side) => /* @__PURE__ */ jsx("path", { d: pathFor(side), fill: "none", stroke: "var(--brain-factual)", opacity: "0.16", strokeWidth: "1" }, side)),
            Array.from({ length: 8 }, (_, ring) => /* @__PURE__ */ jsx("ellipse", { cx: "0", cy: "0", rx: (2.75 - ring * 0.075) * scale, ry: (2.15 - ring * 0.06) * scale, fill: "none", stroke: "var(--brain-factual)", strokeOpacity: 0.015 + ring * 2e-3 }, ring))
          ] }),
          edges.map((edge) => {
            const source = layout.positions[edge.source], target = layout.positions[edge.target];
            if (!source || !target) return null;
            const focus = edge.id === selectedEdgeId || edge.originalEdgeIds?.includes(selectedEdgeId ?? "") || edge.source === selectedNodeId || edge.target === selectedNodeId;
            const style = edgeStyle(edge);
            const self = edge.source === edge.target;
            return /* @__PURE__ */ jsxs("g", { "data-edge-id": edge.id, children: [
              /* @__PURE__ */ jsx("path", { d: self ? `M${source[0] * scale},${-source[1] * scale}c-32,-40 32,-40 0,0` : `M${source[0] * scale},${-source[1] * scale}L${target[0] * scale},${-target[1] * scale}`, stroke: style.color, strokeWidth: focus ? 2 : 1, opacity: focus ? 0.9 : selectedNodeId ? 0.12 : 0.28, strokeDasharray: style.dashed ? "4 5" : void 0, fill: "none", markerEnd: edge.directed ? `url(#${markerId})` : void 0 }),
              /* @__PURE__ */ jsx("path", { d: `M${source[0] * scale},${-source[1] * scale}L${target[0] * scale},${-target[1] * scale}`, stroke: "transparent", strokeWidth: "12" }),
              /* @__PURE__ */ jsxs("title", { children: [
                index.nodes.get(edge.source)?.label ?? edge.source,
                " ",
                edge.directed ? "\u2192" : "\u2194",
                " ",
                index.nodes.get(edge.target)?.label ?? edge.target,
                " \xB7 ",
                style.label,
                " \xB7 ",
                edge.evidence.origin
              ] })
            ] }, edge.id);
          }),
          projection.nodes.map((node) => {
            const p = layout.positions[node.id];
            if (!p) return null;
            const style = nodeStyle(node), r = nodeRadius(node, nodeSize, loadedDegree(index, node.canonicalId ?? node.id));
            const selected = (node.canonicalId ?? node.id) === selectedNodeId;
            const outcome = matches.find((match) => match.nodeId === (node.canonicalId ?? node.id));
            const color = outcome?.section.outcome === "included" ? "var(--brain-included)" : outcome?.section.outcome === "dropped" ? "var(--brain-procedural)" : style.color;
            return /* @__PURE__ */ jsxs("g", { className: "brain-svg-node", "data-node-id": node.id, transform: `translate(${p[0] * scale},${-p[1] * scale})`, onPointerEnter: () => setHover(node.id), onPointerLeave: () => setHover(null), opacity: neighborIds && !neighborIds.has(node.canonicalId ?? node.id) && node.kind !== "aggregate" ? 0.38 : 1, children: [
              /* @__PURE__ */ jsx("circle", { r: Math.max(14, r + 7), fill: "transparent" }),
              selected && /* @__PURE__ */ jsx("circle", { r: r + 7, stroke: color, strokeWidth: "1.5", fill: "none" }),
              /* @__PURE__ */ jsx("g", { fill: color, stroke: color, strokeWidth: selected ? 1.5 : 0.5, fillOpacity: node.kind === "pack" ? 0.4 : 0.9, children: glyph(node, r) }),
              /* @__PURE__ */ jsxs("title", { children: [
                node.label,
                " \xB7 ",
                style.label,
                node.loadedCount ? ` \xB7 ${node.loadedCount} loaded members; total ${node.totalCount ?? "unknown"}` : ""
              ] }),
              labeled.includes(node) && /* @__PURE__ */ jsxs("text", { y: r + 22, textAnchor: "middle", className: selected ? "is-selected" : "", children: [
                node.label.length > 24 ? `${node.label.slice(0, 23)}\u2026` : node.label,
                node.loadedCount ? ` (${node.loadedCount})` : ""
              ] })
            ] }, node.id);
          })
        ] })
      ]
    }
  );
}

// src/renderers/accessible/BrainAccessibleList.tsx
import { useId as useId2, useState as useState2 } from "react";

// src/react/components/Icon.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var paths = {
  left: "m14 6-6 6 6 6",
  right: "m10 6 6 6-6 6",
  up: "m6 14 6-6 6 6",
  down: "m6 10 6 6 6-6",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5",
  fit: "M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M8 12h8m-4-4v8",
  reset: "M3 10a9 9 0 1 1 2 8M3 4v6h6",
  search: "M21 21l-5-5M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14",
  layers: "m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  cube: "m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 9v9m-9-13 9 5 9-5M7 5l9 5",
  link: "m9 15 6-6m-7 3-2 2a4 4 0 0 0 6 6l3-3m-3-9 2-2a4 4 0 0 1 6 6l-3 3",
  info: "M12 11v6m0-10v.01M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0",
  check: "m5 12 4 4L19 6",
  panel: "M3 4h18v16H3V4Zm5 0v16",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  play: "m7 4 14 8-14 8V4Z",
  pause: "M8 5v14M16 5v14",
  share: "M6 12h6m0 0v-6h6m-6 6v6h6M3 9h3v6H3V9Zm15-5h3v4h-3V4Zm0 12h3v4h-3v-4Z"
};
function Icon({ name, className = "" }) {
  return /* @__PURE__ */ jsx2("svg", { className: `brain-icon ${className}`, "aria-hidden": "true", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx2("path", { d: paths[name] }) });
}
function KindGlyph({ style }) {
  return /* @__PURE__ */ jsx2("span", { className: `brain-kind-glyph brain-shape-${style.shape}`, style: { "--kind-color": style.color }, "aria-hidden": "true" });
}

// src/renderers/accessible/BrainAccessibleList.tsx
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
function BrainAccessibleList({ className = "", showSearch = true }) {
  const { graph, index, select, selectedNodeId, nodeStyle, filters, store } = useBrain();
  const [page, setPage] = useState2(0);
  const searchId = useId2();
  const query = filters.query.trim().toLocaleLowerCase();
  const nodes = graph.nodes.filter((node) => (!query || `${node.label} ${node.canonicalRef ?? ""}`.toLocaleLowerCase().includes(query)) && (!filters.kinds.length || filters.kinds.includes(node.kind)));
  const pages = Math.max(1, Math.ceil(nodes.length / 60)), current = Math.min(page, pages - 1);
  return /* @__PURE__ */ jsxs2("section", { className: `brain-accessible-list ${className}`, "aria-label": "Loaded context node list", children: [
    showSearch && /* @__PURE__ */ jsxs2("label", { className: "brain-search", htmlFor: searchId, children: [
      /* @__PURE__ */ jsx3(Icon, { name: "search" }),
      /* @__PURE__ */ jsx3("input", { id: searchId, value: filters.query, placeholder: "Search loaded context", "aria-label": "Search loaded context", onChange: (event) => {
        store.setFilters({ ...filters, query: event.target.value });
        setPage(0);
      } })
    ] }),
    /* @__PURE__ */ jsxs2("p", { className: "brain-muted", children: [
      nodes.length.toLocaleString(),
      " loaded entities \xB7 labels and supplied references"
    ] }),
    /* @__PURE__ */ jsx3("ul", { className: "brain-node-list", children: nodes.slice(current * 60, (current + 1) * 60).map((node) => /* @__PURE__ */ jsx3("li", { children: /* @__PURE__ */ jsxs2("button", { className: "brain-node-row", "aria-label": `${node.label} ${nodeStyle(node).label} \xB7 ${loadedDegree(index, node.id)} loaded relationships${node.version ? ` \xB7 ${node.version}` : ""}`, title: `${node.label} \xB7 ${nodeStyle(node).label} \xB7 ${node.version ?? "version unknown"}`, "aria-pressed": selectedNodeId === node.id, onClick: () => select(node.id), children: [
      /* @__PURE__ */ jsx3(KindGlyph, { style: nodeStyle(node) }),
      /* @__PURE__ */ jsxs2("span", { children: [
        /* @__PURE__ */ jsx3("strong", { children: node.label }),
        /* @__PURE__ */ jsxs2("span", { className: "brain-node-subtitle", children: [
          nodeStyle(node).label,
          " \xB7 ",
          loadedDegree(index, node.id),
          " loaded relationships",
          node.version ? ` \xB7 ${node.version}` : ""
        ] })
      ] }),
      /* @__PURE__ */ jsx3(Icon, { name: "right" })
    ] }) }, node.id)) }),
    !nodes.length && /* @__PURE__ */ jsx3("p", { className: "brain-muted", children: "No matching entities in this loaded projection." }),
    pages > 1 && /* @__PURE__ */ jsxs2("div", { className: "brain-pagination", children: [
      /* @__PURE__ */ jsx3("button", { className: "brain-button", disabled: current === 0, onClick: () => setPage(current - 1), children: "Previous" }),
      /* @__PURE__ */ jsxs2("span", { children: [
        current + 1,
        " / ",
        pages
      ] }),
      /* @__PURE__ */ jsx3("button", { className: "brain-button", disabled: current + 1 === pages, onClick: () => setPage(current + 1), children: "Next" })
    ] })
  ] });
}

// src/react/components/BrainViewport.tsx
import { Fragment, jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
var RendererBoundary = class extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error, _info) {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
};
function BrainViewport({ renderer, layout, forceWebGLFailure = false, renderExtraWebGL, loadingSlot, emptySlot, errorSlot, unsupportedSlot, interactive = true, showLabels = true }) {
  const { view, store, projection, selectedNodeId, index, select, camera, dataStatus, onDiagnostic, loadWebGLRenderer } = useBrain();
  const ref = useRef2(null), [size, setSize] = useState3({ width: 0, height: 0 }), [visible, setVisible] = useState3(true);
  const [failure, setFailure] = useState3(null), [readyToken, setReadyToken] = useState3(null), [attempt, setAttempt] = useState3(0);
  const LazyWebGL = useMemo2(() => loadWebGLRenderer ? lazy(() => loadWebGLRenderer().then((module) => ({ default: module.BrainWebGLRenderer }))) : null, [loadWebGLRenderer, attempt]);
  const choice = renderer ?? view.renderer, wantsWebGL = choice === "auto" || choice === "webgl", usable3D = wantsWebGL && !!LazyWebGL && !failure && !forceWebGLFailure;
  const hasSize = size.width > 0 && size.height > 0, hasNodes = projection.nodes.length > 0, unavailable = dataStatus === "unavailable";
  const initializationToken = useMemo2(() => ({}), [usable3D, LazyWebGL, attempt, hasSize, hasNodes, unavailable]);
  const ready = readyToken === initializationToken;
  useEffect2(() => {
    if (layout && layout !== view.layout) store.setView({ ...view, layout });
  }, [layout, store, view]);
  useEffect2(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
    });
    observer.observe(element);
    let intersects = true;
    const updateVisibility = () => {
      const next = intersects && !document.hidden;
      setVisible(next);
      if (!next) camera.pause();
    };
    const intersection = new IntersectionObserver((entries) => {
      intersects = entries[0].isIntersecting;
      updateVisibility();
    });
    intersection.observe(element);
    const visibility = updateVisibility;
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [camera]);
  useEffect2(() => {
    if (!usable3D || ready || !hasSize || !hasNodes || unavailable) return;
    const timeout = setTimeout(() => {
      setFailure("initialization timeout");
      onDiagnostic?.({ category: "renderer-fallback", value: 1 });
    }, 6500);
    return () => clearTimeout(timeout);
  }, [usable3D, ready, initializationToken, hasSize, hasNodes, unavailable, onDiagnostic]);
  useEffect2(() => {
    onDiagnostic?.({ category: "renderer-selected", value: choice === "list" ? 2 : usable3D && ready ? 0 : 1, nodeCount: projection.nodes.length, edgeCount: projection.edges.length });
  }, [choice, usable3D, ready, onDiagnostic, projection.nodes.length, projection.edges.length]);
  const failed = wantsWebGL && (failure || forceWebGLFailure);
  const fail = (category) => {
    setFailure(category);
    setReadyToken(null);
    onDiagnostic?.({ category: "renderer-fallback", value: 1 });
  };
  return /* @__PURE__ */ jsxs3(
    "div",
    {
      ref,
      className: "brain-viewport",
      tabIndex: interactive ? 0 : -1,
      "aria-label": interactive ? "Knowledge visualization. Arrow keys rotate. Plus and minus zoom. Escape clears selection." : "Read-only knowledge visualization",
      "data-active-renderer": choice === "list" ? "list" : usable3D && ready ? "webgl" : "svg",
      onKeyDown: (event) => {
        if (!interactive) return;
        if (event.target.closest("input,textarea,select,[contenteditable=true]")) return;
        const rotations = { ArrowLeft: [-Math.PI / 12, 0], ArrowRight: [Math.PI / 12, 0], ArrowUp: [0, -Math.PI / 12], ArrowDown: [0, Math.PI / 12] };
        if (rotations[event.key]) {
          event.preventDefault();
          const [yaw, pitch] = rotations[event.key];
          camera.send({ type: "rotate", yaw, pitch });
        }
        if (event.key === "+" || event.key === "=") {
          event.preventDefault();
          camera.send({ type: "zoom", factor: 1.2 });
        }
        if (event.key === "-") {
          event.preventDefault();
          camera.send({ type: "zoom", factor: 1 / 1.2 });
        }
        if (event.key === "Escape" && selectedNodeId) {
          event.preventDefault();
          event.stopPropagation();
          select(null);
        }
      },
      children: [
        dataStatus === "unavailable" ? errorSlot ?? /* @__PURE__ */ jsxs3("div", { className: "brain-empty", role: "alert", children: [
          /* @__PURE__ */ jsx4(Icon, { name: "info" }),
          /* @__PURE__ */ jsx4("h2", { children: "Data unavailable" }),
          /* @__PURE__ */ jsx4("p", { children: "The host projection is unavailable or invalid. No policy fallback is attempted." })
        ] }) : projection.nodes.length === 0 ? emptySlot ?? /* @__PURE__ */ jsxs3("div", { className: "brain-empty", children: [
          /* @__PURE__ */ jsx4(Icon, { name: "search" }),
          /* @__PURE__ */ jsx4("h2", { children: "No loaded context to display" }),
          /* @__PURE__ */ jsx4("p", { children: "Adjust the filters or supply an authorized graph." })
        ] }) : choice === "list" ? /* @__PURE__ */ jsx4(BrainAccessibleList, {}) : size.width > 0 && size.height > 0 ? /* @__PURE__ */ jsxs3(Fragment, { children: [
          (!usable3D || !ready) && /* @__PURE__ */ jsx4(BrainSvgRenderer, { ...size, active: visible && (!usable3D || !ready), interactive, showLabels }),
          usable3D && LazyWebGL && /* @__PURE__ */ jsx4("div", { className: `brain-webgl-layer ${ready ? "is-ready" : ""}`, children: /* @__PURE__ */ jsx4(RendererBoundary, { onError: () => fail("initialization"), children: /* @__PURE__ */ jsx4(Suspense, { fallback: null, children: /* @__PURE__ */ jsx4(LazyWebGL, { ...size, active: visible, interactive, showLabels, onReady: () => setReadyToken(initializationToken), onFailure: fail, renderExtra: renderExtraWebGL }) }) }, attempt) }),
          choice === "webgl" && !loadWebGLRenderer && /* @__PURE__ */ jsx4("div", { className: "brain-renderer-notice", role: "status", children: "3D unsupported: register the optional WebGL renderer. 2D remains available." }),
          usable3D && !ready && /* @__PURE__ */ jsx4("div", { className: "brain-renderer-notice", role: "status", children: loadingSlot ?? "Preparing 3D \xB7 2D remains available" }),
          failed && /* @__PURE__ */ jsxs3("div", { className: "brain-renderer-notice", role: "status", children: [
            unsupportedSlot ?? /* @__PURE__ */ jsxs3(Fragment, { children: [
              "Renderer downgraded to 2D \xB7 ",
              forceWebGLFailure ? "simulated WebGL failure" : failure
            ] }),
            /* @__PURE__ */ jsx4("button", { className: "brain-text-button", onClick: () => {
              setFailure(null);
              setReadyToken(null);
              setAttempt((value) => value + 1);
            }, disabled: forceWebGLFailure, children: "Retry 3D" })
          ] })
        ] }) : /* @__PURE__ */ jsx4("span", { className: "brain-sr-only", children: "Waiting for a visible container." }),
        /* @__PURE__ */ jsxs3("div", { className: "brain-sr-only", role: "status", "aria-live": "polite", children: [
          selectedNodeId ? `Selected ${index.nodes.get(selectedNodeId)?.label ?? "entity unavailable"}` : "No entity selected",
          ". ",
          choice === "list" ? "Accessible list" : usable3D && ready ? "3D WebGL" : "2D graph",
          " renderer."
        ] })
      ]
    }
  );
}

// src/react/components/BrainToolbar.tsx
import { useSyncExternalStore } from "react";
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
function BrainToolbar() {
  const { camera } = useBrain(), reduced = useReducedMotion();
  useSyncExternalStore(camera.subscribe, camera.getSnapshot, camera.getSnapshot);
  const actions = [
    { label: "Rotate left", icon: "left", action: () => camera.send({ type: "rotate", yaw: -Math.PI / 12, pitch: 0 }) },
    { label: "Rotate right", icon: "right", action: () => camera.send({ type: "rotate", yaw: Math.PI / 12, pitch: 0 }) },
    { label: "Rotate up", icon: "up", action: () => camera.send({ type: "rotate", yaw: 0, pitch: -Math.PI / 12 }) },
    { label: "Rotate down", icon: "down", action: () => camera.send({ type: "rotate", yaw: 0, pitch: Math.PI / 12 }) }
  ];
  return /* @__PURE__ */ jsxs4("div", { className: "brain-camera-toolbar", role: "toolbar", "aria-label": "Camera controls", children: [
    /* @__PURE__ */ jsx5("div", { className: "brain-toolbar-cluster", children: actions.map((action) => /* @__PURE__ */ jsx5("button", { className: "brain-icon-button", "aria-label": action.label, title: action.label, onClick: action.action, children: /* @__PURE__ */ jsx5(Icon, { name: action.icon }) }, action.label)) }),
    /* @__PURE__ */ jsx5("span", { className: "brain-toolbar-divider" }),
    /* @__PURE__ */ jsxs4("div", { className: "brain-toolbar-cluster", children: [
      /* @__PURE__ */ jsx5("button", { className: "brain-icon-button", "aria-label": "Zoom in", title: "Zoom in", onClick: () => camera.send({ type: "zoom", factor: 1.18 }), children: /* @__PURE__ */ jsx5(Icon, { name: "plus" }) }),
      /* @__PURE__ */ jsx5("button", { className: "brain-icon-button", "aria-label": "Zoom out", title: "Zoom out", onClick: () => camera.send({ type: "zoom", factor: 1 / 1.18 }), children: /* @__PURE__ */ jsx5(Icon, { name: "minus" }) }),
      /* @__PURE__ */ jsx5("button", { className: "brain-icon-button", "aria-label": "Fit visible context", title: "Fit visible context", onClick: () => camera.send({ type: "fit" }), children: /* @__PURE__ */ jsx5(Icon, { name: "fit" }) }),
      /* @__PURE__ */ jsx5("button", { className: "brain-icon-button", "aria-label": "Reset camera", title: "Reset camera", onClick: () => camera.send({ type: "reset" }), children: /* @__PURE__ */ jsx5(Icon, { name: "reset" }) })
    ] }),
    /* @__PURE__ */ jsx5("span", { className: "brain-toolbar-divider" }),
    /* @__PURE__ */ jsxs4("button", { className: "brain-auto-rotate", "aria-pressed": camera.autoRotate, onClick: () => camera.setAutoRotate(!camera.autoRotate), title: reduced ? "Explicitly enable rotation; reduced motion disables automatic camera transitions" : "Auto-rotate; interaction pauses it", children: [
      /* @__PURE__ */ jsx5(Icon, { name: camera.autoRotate ? "pause" : "play" }),
      /* @__PURE__ */ jsx5("span", { children: "Auto-rotate" }),
      /* @__PURE__ */ jsx5("span", { className: `brain-toggle ${camera.autoRotate ? "is-on" : ""}` })
    ] })
  ] });
}

// src/react/components/BrainTierNavigator.tsx
import { useSyncExternalStore as useSyncExternalStore3 } from "react";

// src/react/components/BrainFieldControls.tsx
import { useCallback, useEffect as useEffect3, useId as useId3, useLayoutEffect, useRef as useRef3, useState as useState4, useSyncExternalStore as useSyncExternalStore2 } from "react";
import { createPortal } from "react-dom";
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
var useClientLayoutEffect = typeof window === "undefined" ? useEffect3 : useLayoutEffect;
function FieldPopover({ anchor, role, id, children, onClose, focusFirst = false, onEnter, onLeave }) {
  const [portal, setPortal] = useState4(null), content = useRef3(null);
  const didFocus = useRef3(false);
  const [position, setPosition] = useState4(null);
  useClientLayoutEffect(() => {
    setPortal(anchor.current?.closest('[role="dialog"], .brain-explorer') ?? document.body);
  }, [anchor]);
  useClientLayoutEffect(() => {
    const trigger = anchor.current, element = content.current;
    if (!portal || !trigger || !element) return;
    const place = () => {
      const a = trigger.getBoundingClientRect(), p = portal.getBoundingClientRect();
      const body = portal === document.body, width = body ? window.innerWidth : portal.clientWidth, height = body ? window.innerHeight : portal.clientHeight;
      const x = a.left - (body ? 0 : p.left), y = a.top - (body ? 0 : p.top);
      const w = Math.max(1, Math.min(role === "tooltip" ? 360 : Math.max(200, a.width), width - 24));
      const h = element.getBoundingClientRect().height;
      const top = y + a.height + h + 8 > height ? Math.max(8, y - h - 8) : y + a.height + 8;
      const next = { left: Math.max(8, Math.min(x, width - w - 8)) + (body ? window.scrollX : 0), top: top + (body ? window.scrollY : 0), width: w };
      setPosition((old) => old && old.left === next.left && old.top === next.top && old.width === next.width ? old : next);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    observer.observe(portal);
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
    };
  }, [portal, anchor, role, focusFirst]);
  useClientLayoutEffect(() => {
    if (!focusFirst || !position || didFocus.current || !content.current) return;
    didFocus.current = true;
    const element = content.current;
    (element.querySelector('[aria-checked="true"]:not(:disabled)') ?? element.querySelector("button:not(:disabled)"))?.focus();
  }, [focusFirst, position]);
  useEffect3(() => {
    const outside = (event) => {
      if (!anchor.current?.contains(event.target) && !content.current?.contains(event.target)) onClose();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [anchor, onClose]);
  if (!portal) return null;
  return createPortal(/* @__PURE__ */ jsx6(
    "div",
    {
      ref: content,
      role,
      id,
      className: `brain-field-popover brain-field-${role}`,
      style: { ...position, visibility: position ? "visible" : "hidden" },
      onPointerEnter: onEnter,
      onPointerLeave: onLeave,
      onKeyDown: (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          anchor.current?.focus();
        }
        if (role !== "menu") return;
        const buttons = [...content.current.querySelectorAll("button:not(:disabled)")];
        const index = buttons.indexOf(document.activeElement);
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next]?.focus();
        }
        if (event.key === "Tab") {
          onClose();
          anchor.current?.focus();
        }
      },
      children
    }
  ), portal);
}
function BrainPicker({ label, value, options, onChange }) {
  const [open, setOpen] = useState4(false), anchor = useRef3(null), id = useId3();
  const close = useCallback(() => setOpen(false), []);
  const selected = options.find((option) => option.value === value);
  return /* @__PURE__ */ jsxs5("div", { className: "brain-picker", children: [
    /* @__PURE__ */ jsx6("span", { className: "brain-picker-label", children: label }),
    /* @__PURE__ */ jsxs5(
      "button",
      {
        ref: anchor,
        type: "button",
        className: "brain-picker-trigger",
        "aria-label": `${label}: ${selected?.label ?? ""}`,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? id : void 0,
        onClick: () => setOpen(!open),
        onKeyDown: (event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        },
        children: [
          selected?.icon,
          /* @__PURE__ */ jsx6("span", { children: selected?.label ?? label }),
          /* @__PURE__ */ jsx6(Icon, { name: "down" })
        ]
      }
    ),
    open && /* @__PURE__ */ jsx6(FieldPopover, { anchor, role: "menu", id, onClose: close, focusFirst: true, children: options.map((option) => /* @__PURE__ */ jsxs5(
      "button",
      {
        type: "button",
        role: "menuitemradio",
        "aria-checked": value === option.value,
        disabled: option.disabled,
        onClick: () => {
          onChange(option.value);
          close();
          anchor.current?.focus();
        },
        children: [
          option.icon,
          /* @__PURE__ */ jsx6("span", { children: option.label }),
          value === option.value && /* @__PURE__ */ jsx6(Icon, { name: "check" })
        ]
      },
      option.value
    )) })
  ] });
}
function BrainConnectionPicker({ label = "Connections", labels = ["All items", "Direct connections", "Within two connections"] }) {
  const { store } = useBrainContext();
  const { filters, selectedNodeId } = useSyncExternalStore2(store.subscribe, store.getSnapshot, store.getSnapshot);
  return /* @__PURE__ */ jsx6(BrainPicker, { label, value: String(filters.neighborhood), options: [
    { value: "0", label: labels[0], icon: /* @__PURE__ */ jsx6(Icon, { name: "layers" }) },
    { value: "1", label: labels[1], icon: /* @__PURE__ */ jsx6(Icon, { name: "link" }), disabled: !selectedNodeId },
    { value: "2", label: labels[2], icon: /* @__PURE__ */ jsx6(Icon, { name: "share" }), disabled: !selectedNodeId }
  ], onChange: (value) => store.setFilters({ ...filters, neighborhood: Number(value) }) });
}
function BrainCopyField({ value, label = "Source field" }) {
  const anchor = useRef3(null), id = useId3(), timer = useRef3(void 0), generation = useRef3(0);
  const [open, setOpen] = useState4(false), [feedback, setFeedback] = useState4("");
  const close = useCallback(() => setOpen(false), []);
  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (document.activeElement !== anchor.current) close();
    }, 120);
  };
  useEffect3(() => {
    setFeedback("");
    setOpen(false);
    return () => {
      generation.current++;
      clearTimeout(timer.current);
    };
  }, [value]);
  async function copy() {
    const request = ++generation.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      if (request === generation.current) setFeedback("Copied");
    } catch {
      if (request === generation.current) setFeedback("Copy unavailable. Select the full field to copy it.");
    }
  }
  return /* @__PURE__ */ jsxs5("div", { className: "brain-copy-field", children: [
    /* @__PURE__ */ jsx6(
      "button",
      {
        ref: anchor,
        type: "button",
        "aria-label": `Copy ${label.toLocaleLowerCase()}: ${value}`,
        "aria-describedby": open ? id : void 0,
        onPointerEnter: show,
        onPointerLeave: hide,
        onFocus: show,
        onBlur: hide,
        onKeyDown: (event) => {
          if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        },
        onClick: () => {
          show();
          void copy();
        },
        children: value
      }
    ),
    open && /* @__PURE__ */ jsxs5(FieldPopover, { anchor, role: "tooltip", id, onClose: close, onEnter: show, onLeave: hide, children: [
      /* @__PURE__ */ jsx6("span", { children: value }),
      /* @__PURE__ */ jsx6("small", { children: feedback || "Click the field to copy" })
    ] }),
    /* @__PURE__ */ jsx6("span", { className: open ? "brain-sr-only" : "brain-copy-feedback", role: "status", children: feedback })
  ] });
}

// src/react/components/BrainTierNavigator.tsx
import { jsx as jsx7, jsxs as jsxs6 } from "react/jsx-runtime";
function GroupRow({ group, depth, hierarchy, expandedGroups, filters, store }) {
  const children = hierarchy.groups.filter((candidate) => candidate.parentGroupId === group.id);
  const expanded = expandedGroups.includes(group.id);
  const members = groupMembers(hierarchy, group.id);
  if (!members.size) return null;
  return /* @__PURE__ */ jsxs6("li", { children: [
    /* @__PURE__ */ jsxs6("div", { className: `brain-tree-row ${filters.groupId === group.id ? "is-active" : ""}`, style: { paddingInlineStart: `${10 + depth * 13}px` }, children: [
      /* @__PURE__ */ jsx7("button", { className: "brain-tree-expand", "aria-expanded": expanded, "aria-label": `${expanded ? "Collapse" : "Expand"} ${group.label}`, onClick: () => store.setExpandedGroups(expanded ? expandedGroups.filter((id) => id !== group.id) : [...expandedGroups, group.id]), children: /* @__PURE__ */ jsx7(Icon, { name: expanded ? "down" : "right" }) }),
      /* @__PURE__ */ jsxs6("button", { className: "brain-tree-name", "aria-pressed": filters.groupId === group.id, onClick: () => {
        store.setFilters({ ...filters, groupId: filters.groupId === group.id ? null : group.id });
        if (!expanded) store.setExpandedGroups([...expandedGroups, group.id]);
      }, children: [
        /* @__PURE__ */ jsx7("span", { children: group.label }),
        /* @__PURE__ */ jsx7("span", { className: "brain-tree-count", title: "Loaded entity count; authoritative total may be unknown", children: members.size })
      ] })
    ] }),
    expanded && children.length > 0 && /* @__PURE__ */ jsx7("ul", { children: children.map((child) => /* @__PURE__ */ jsx7(GroupRow, { group: child, depth: depth + 1, hierarchy, expandedGroups, filters, store }, child.id)) })
  ] });
}
function BrainKindFilters({ label = "Information types", kindLabels }) {
  const { store, preset, nodeStyleResolver } = useBrainContext();
  const { graph, filters } = useSyncExternalStore3(store.subscribe, store.getSnapshot, store.getSnapshot);
  const counts = /* @__PURE__ */ new Map();
  for (const node of graph.nodes) counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
  return /* @__PURE__ */ jsx7("div", { className: "brain-kind-filter-section", children: /* @__PURE__ */ jsxs6("fieldset", { className: "brain-kind-filters", children: [
    /* @__PURE__ */ jsx7("legend", { children: label }),
    [...counts].map(([kind, count]) => {
      const sample = graph.nodes.find((node) => node.kind === kind);
      const checked = !filters.kinds.length || filters.kinds.includes(kind), defaults = resolveNodeStyle(kind, preset);
      const style = nodeStyleResolver?.(sample, defaults) ?? defaults;
      return /* @__PURE__ */ jsxs6("label", { children: [
        /* @__PURE__ */ jsx7("input", { type: "checkbox", checked, onChange: () => {
          const current = filters.kinds.length ? filters.kinds : [...counts.keys()];
          const next = checked ? current.filter((value) => value !== kind) : [...current, kind];
          store.setFilters({ ...filters, kinds: next.length ? next : ["__none__"] });
        } }),
        /* @__PURE__ */ jsx7(KindGlyph, { style }),
        /* @__PURE__ */ jsx7("span", { children: kindLabels?.[kind] ?? `${style.label}s` }),
        /* @__PURE__ */ jsx7("span", { className: "brain-tree-count", children: count })
      ] }, kind);
    })
  ] }) });
}
function BrainTierNavigator({ onClose }) {
  const { hierarchy, graph, expandedGroups, store, filters } = useBrain();
  const ancestors = filters.groupId ? groupAncestors(hierarchy, filters.groupId) : [];
  const roots = hierarchy.groups.filter((group) => !group.parentGroupId);
  return /* @__PURE__ */ jsxs6("aside", { className: "brain-navigator", "aria-label": "Knowledge navigator", children: [
    /* @__PURE__ */ jsxs6("div", { className: "brain-panel-heading", children: [
      /* @__PURE__ */ jsxs6("span", { children: [
        /* @__PURE__ */ jsx7(Icon, { name: "layers" }),
        "Context navigator"
      ] }),
      onClose && /* @__PURE__ */ jsx7("button", { className: "brain-icon-button", "aria-label": "Close navigator", onClick: onClose, children: /* @__PURE__ */ jsx7(Icon, { name: "panel" }) })
    ] }),
    /* @__PURE__ */ jsxs6("div", { className: "brain-nav-scroll", children: [
      /* @__PURE__ */ jsxs6("div", { className: "brain-section-title", children: [
        /* @__PURE__ */ jsx7("span", { children: "Knowledge hierarchy" }),
        /* @__PURE__ */ jsx7("span", { className: "brain-small-badge", children: graph.nodes.length })
      ] }),
      ancestors.length > 0 && /* @__PURE__ */ jsxs6("nav", { className: "brain-breadcrumbs", "aria-label": "Hierarchy breadcrumbs", children: [
        /* @__PURE__ */ jsx7("button", { onClick: () => store.setFilters({ ...filters, groupId: null }), children: "All" }),
        ancestors.map((id) => /* @__PURE__ */ jsxs6("button", { onClick: () => store.setFilters({ ...filters, groupId: id }), children: [
          "/ ",
          hierarchy.groups.find((group) => group.id === id)?.label
        ] }, id)),
        /* @__PURE__ */ jsxs6("button", { "aria-label": "Back one hierarchy level", onClick: () => store.setFilters({ ...filters, groupId: ancestors.at(-2) ?? null }), children: [
          /* @__PURE__ */ jsx7(Icon, { name: "left" }),
          "Back"
        ] })
      ] }),
      roots.length ? /* @__PURE__ */ jsx7("ul", { className: "brain-tree", children: roots.map((group) => /* @__PURE__ */ jsx7(GroupRow, { group, depth: 0, hierarchy, expandedGroups, filters, store }, group.id)) }) : /* @__PURE__ */ jsx7("p", { className: "brain-help", children: "Flat projection \xB7 no presentation groups supplied." }),
      /* @__PURE__ */ jsxs6("div", { className: "brain-nav-actions", children: [
        /* @__PURE__ */ jsx7("button", { onClick: () => store.setExpandedGroups(hierarchy.groups.map((group) => group.id)), children: "Expand all" }),
        /* @__PURE__ */ jsx7("span", { children: "\xB7" }),
        /* @__PURE__ */ jsx7("button", { onClick: () => store.setExpandedGroups([]), children: "Collapse all" })
      ] }),
      /* @__PURE__ */ jsx7(BrainKindFilters, {}),
      /* @__PURE__ */ jsx7("div", { className: "brain-field", children: /* @__PURE__ */ jsx7(BrainConnectionPicker, {}) }),
      (filters.kinds.length > 0 || filters.groupId || filters.neighborhood > 0 || filters.query) && /* @__PURE__ */ jsx7("button", { className: "brain-button brain-clear-filters", onClick: () => store.setFilters({ query: "", kinds: [], groupId: null, neighborhood: 0 }), children: "Clear filters" })
    ] }),
    /* @__PURE__ */ jsxs6("div", { className: "brain-nav-note", children: [
      /* @__PURE__ */ jsx7(Icon, { name: "info" }),
      /* @__PURE__ */ jsx7("p", { children: "Presentation tiers, not storage or authorization boundaries. Counts reflect loaded data." })
    ] })
  ] });
}

// src/react/components/BrainInspector.tsx
import { useId as useId4, useState as useState5 } from "react";
import { jsx as jsx8, jsxs as jsxs7 } from "react/jsx-runtime";
function BrainInspector({ renderNodeDetails, renderNodeActions, onClose, showContextActions = true, inspectorOptions = {} }) {
  const { selectedNodeId, index, graph, select, selectEdge, selectedEdgeId, nodeStyle, edgeStyle, details, observation, store, tray, camera } = useBrain();
  const [tab, setTab] = useState5("details"), [pathTarget, setPathTarget] = useState5(""), [pathMessage, setPathMessage] = useState5("");
  const id = useId4();
  if (!selectedNodeId) return null;
  const node = index.nodes.get(selectedNodeId);
  if (!node) return /* @__PURE__ */ jsxs7("aside", { className: "brain-inspector", "aria-label": "Selected entity unavailable", children: [
    /* @__PURE__ */ jsxs7("div", { className: "brain-panel-heading", children: [
      /* @__PURE__ */ jsx8("span", { children: "Entity unavailable" }),
      /* @__PURE__ */ jsx8("button", { className: "brain-icon-button", "aria-label": "Clear unavailable selection", onClick: () => select(null), children: /* @__PURE__ */ jsx8(Icon, { name: "close" }) })
    ] }),
    /* @__PURE__ */ jsx8("p", { className: "brain-help", children: "The selected entity is no longer available in this loaded projection. This does not distinguish removed, denied, or not yet loaded." })
  ] });
  const kind = nodeStyle(node), incoming = index.incoming.get(node.id) ?? [], outgoing = index.outgoing.get(node.id) ?? [];
  const relationshipCount = new Set([...incoming, ...outgoing].map((edge) => edge.id)).size;
  const labels = { source: "Source", sourceEvidence: "Source field", version: "Version", unknownVersion: "Unknown", completeness: "Completeness", metadataFooter: "Metadata only \xB7 authorized projection", ...inspectorOptions.labels };
  const version = node.version?.trim() && !/^(?:version\s+)?unknown$/i.test(node.version.trim()) ? node.version.trim() : null;
  const metadata = node.metadata && typeof node.metadata === "object" && !Array.isArray(node.metadata) ? node.metadata : {};
  const matches = observation ? matchObservation(graph, observation).filter((match) => match.nodeId === node.id) : [];
  const close = () => {
    select(null);
    onClose?.();
  };
  return /* @__PURE__ */ jsxs7("aside", { className: "brain-inspector", "aria-label": "Node inspector", children: [
    /* @__PURE__ */ jsxs7("div", { className: "brain-panel-heading", children: [
      /* @__PURE__ */ jsx8("span", { children: "Inspector" }),
      /* @__PURE__ */ jsx8("button", { className: "brain-icon-button", "aria-label": "Close inspector", onClick: close, children: /* @__PURE__ */ jsx8(Icon, { name: "close" }) })
    ] }),
    /* @__PURE__ */ jsxs7("div", { className: "brain-inspector-identity", children: [
      /* @__PURE__ */ jsxs7("span", { className: "brain-kind-tag", children: [
        /* @__PURE__ */ jsx8(KindGlyph, { style: kind }),
        kind.label,
        (version || inspectorOptions.showUnknownVersion) && /* @__PURE__ */ jsx8("span", { className: "brain-version", children: version ?? labels.unknownVersion })
      ] }),
      /* @__PURE__ */ jsx8("h2", { children: node.label }),
      /* @__PURE__ */ jsx8("p", { className: "brain-muted", children: node.kind === "skill" ? "Procedural context" : node.kind === "page" ? "Factual context \xB7 page" : node.kind === "pack" ? "Factual context \xB7 knowledge pack" : "Loaded knowledge entity" })
    ] }),
    /* @__PURE__ */ jsxs7("div", { className: "brain-inspector-tabs", role: "tablist", "aria-label": "Inspector sections", children: [
      /* @__PURE__ */ jsx8("button", { id: `${id}-details-tab`, role: "tab", "aria-selected": tab === "details", "aria-controls": `${id}-details`, onClick: () => setTab("details"), children: "Details" }),
      /* @__PURE__ */ jsxs7("button", { id: `${id}-relations-tab`, role: "tab", "aria-selected": tab === "relationships", "aria-controls": `${id}-relations`, onClick: () => setTab("relationships"), children: [
        "Relationships ",
        /* @__PURE__ */ jsx8("span", { className: "brain-relationship-count", "aria-label": `${relationshipCount} relationships`, children: relationshipCount })
      ] })
    ] }),
    /* @__PURE__ */ jsx8("div", { className: "brain-inspector-scroll", children: tab === "details" ? /* @__PURE__ */ jsxs7("div", { role: "tabpanel", id: `${id}-details`, "aria-labelledby": `${id}-details-tab`, children: [
      node.canonicalRef && /* @__PURE__ */ jsxs7("div", { className: "brain-detail-block", children: [
        /* @__PURE__ */ jsx8("h3", { children: "Canonical reference" }),
        /* @__PURE__ */ jsx8("code", { className: "brain-reference", children: node.canonicalRef })
      ] }),
      /* @__PURE__ */ jsxs7("dl", { className: "brain-metadata", children: [
        (version || inspectorOptions.showUnknownVersion) && /* @__PURE__ */ jsxs7("div", { children: [
          /* @__PURE__ */ jsx8("dt", { children: labels.version }),
          /* @__PURE__ */ jsx8("dd", { children: version ?? labels.unknownVersion })
        ] }),
        /* @__PURE__ */ jsxs7("div", { children: [
          /* @__PURE__ */ jsx8("dt", { children: labels.source }),
          /* @__PURE__ */ jsx8("dd", { children: typeof metadata.provenance === "string" ? metadata.provenance : "Not supplied" })
        ] }),
        inspectorOptions.showCompleteness && /* @__PURE__ */ jsxs7("div", { children: [
          /* @__PURE__ */ jsx8("dt", { children: labels.completeness }),
          /* @__PURE__ */ jsx8("dd", { children: typeof metadata.completeness === "string" ? metadata.completeness : graph.completeness })
        ] }),
        Object.entries(node.metrics ?? {}).map(([key, value]) => /* @__PURE__ */ jsxs7("div", { children: [
          /* @__PURE__ */ jsx8("dt", { children: { targetTokens: "Target tokens", contentBytes: "Content bytes", pageCount: "Reported pages", loadedPageCount: "Loaded pages" }[key] ?? key }),
          /* @__PURE__ */ jsx8("dd", { children: value === null ? "Unknown" : value.toLocaleString() })
        ] }, key))
      ] }),
      metadata.sharedReadOnly === true && /* @__PURE__ */ jsx8("div", { className: "brain-notice", children: "Read-only shared Pack \xB7 authorized host projection. The viewer grants no access." }),
      metadata.containsPhi === true && /* @__PURE__ */ jsx8("div", { className: "brain-notice", children: "PHI-marked metadata only. No body supplied. Redaction is unknown unless separately evidenced." }),
      typeof metadata.description === "string" && metadata.description && /* @__PURE__ */ jsx8("p", { className: "brain-help", children: metadata.description }),
      /* @__PURE__ */ jsxs7("div", { className: "brain-detail-block", children: [
        /* @__PURE__ */ jsx8("h3", { children: labels.sourceEvidence }),
        /* @__PURE__ */ jsx8(BrainCopyField, { label: labels.sourceEvidence, value: typeof metadata.evidence === "string" ? metadata.evidence : "Supplied authorized graph projection" }, `${node.id}:${String(metadata.evidence)}`)
      ] }),
      matches.map((match, i) => /* @__PURE__ */ jsxs7("div", { className: "brain-notice", children: [
        observation?.simulated ? "Simulated \xB7 " : "",
        match.section.outcome,
        " \xB7 redaction ",
        match.section.redactionApplied === null ? "unknown" : match.section.redactionApplied ? "applied" : "not applied",
        " \xB7 retained tokens ",
        match.section.compiledTokenCount ?? "unknown"
      ] }, i)),
      observation?.status === "success" && matches.length === 0 && /* @__PURE__ */ jsxs7("p", { className: "brain-help", children: [
        observation.simulated ? "Simulated observation \xB7 " : "",
        "No matching version-specific outcome is established for this entity."
      ] }),
      details.status === "loading" && /* @__PURE__ */ jsx8("p", { role: "status", className: "brain-help", children: "Loading authorized details\u2026" }),
      details.status === "unavailable" && /* @__PURE__ */ jsx8("p", { role: "status", className: "brain-help", children: "Additional authorized details are unavailable. Loaded metadata remains visible." }),
      details.status === "ready" && /* @__PURE__ */ jsxs7("div", { className: "brain-detail-block", children: [
        /* @__PURE__ */ jsx8("h3", { children: "Authorized details" }),
        /* @__PURE__ */ jsx8("dl", { className: "brain-metadata", children: details.value.fields.map((field) => /* @__PURE__ */ jsxs7("div", { children: [
          /* @__PURE__ */ jsx8("dt", { children: field.label }),
          /* @__PURE__ */ jsx8("dd", { children: field.copyable && typeof field.value === "string" ? /* @__PURE__ */ jsx8(BrainCopyField, { label: field.label, value: field.value }, `${node.id}:${field.value}`) : field.value === null ? "Unknown" : String(field.value) })
        ] }, field.label)) }),
        details.value.authorizedText && /* @__PURE__ */ jsx8("p", { className: "brain-safe-text", children: details.value.authorizedText })
      ] }),
      renderNodeDetails?.(node),
      /* @__PURE__ */ jsxs7("div", { className: "brain-detail-block", children: [
        /* @__PURE__ */ jsx8("h3", { children: "Connected context" }),
        outgoing.slice(0, 3).map((edge) => /* @__PURE__ */ jsxs7("button", { className: "brain-mini-relation", onClick: () => {
          selectEdge(edge);
          setTab("relationships");
        }, children: [
          /* @__PURE__ */ jsx8(Icon, { name: "arrow" }),
          /* @__PURE__ */ jsxs7("span", { children: [
            index.nodes.get(edge.target)?.label ?? "Unavailable",
            /* @__PURE__ */ jsx8("small", { children: edgeStyle(edge).label })
          ] }),
          /* @__PURE__ */ jsx8(Icon, { name: "right" })
        ] }, edge.id)),
        !outgoing.length && /* @__PURE__ */ jsx8("p", { className: "brain-help", children: "No known outgoing connection in this loaded projection." })
      ] })
    ] }) : /* @__PURE__ */ jsxs7("div", { role: "tabpanel", id: `${id}-relations`, "aria-labelledby": `${id}-relations-tab`, children: [
      ["outgoing", "incoming"].map((direction) => /* @__PURE__ */ jsxs7("div", { className: "brain-detail-block", children: [
        /* @__PURE__ */ jsxs7("h3", { children: [
          direction === "outgoing" ? "Outgoing" : "Incoming",
          " relationships"
        ] }),
        (direction === "outgoing" ? outgoing : incoming).map((edge) => {
          const other = index.nodes.get(edge.source === node.id ? edge.target : edge.source);
          const explanation = edge.metadata && typeof edge.metadata === "object" && !Array.isArray(edge.metadata) ? edge.metadata.explanation : null;
          return /* @__PURE__ */ jsxs7("button", { className: "brain-relation", "aria-label": `${edgeStyle(edge).label} \xB7 ${edge.directed ? "directed" : "undirected"} ${other?.label ?? "Unavailable"}. ${index.nodes.get(edge.source)?.label} ${edge.directed ? "to" : "and"} ${index.nodes.get(edge.target)?.label}. Evidence ${edge.evidence.origin}. ${typeof explanation === "string" ? explanation : "Explicit supplied relationship."}`, "aria-pressed": selectedEdgeId === edge.id, onClick: () => selectEdge(edge), children: [
            /* @__PURE__ */ jsxs7("span", { className: "brain-relation-type", children: [
              /* @__PURE__ */ jsx8(Icon, { name: direction === "outgoing" ? "arrow" : "left" }),
              edgeStyle(edge).label,
              " \xB7 ",
              edge.directed ? "directed" : "undirected"
            ] }),
            /* @__PURE__ */ jsx8("strong", { children: other?.label ?? "Unavailable" }),
            /* @__PURE__ */ jsxs7("span", { className: "brain-relation-direction", children: [
              index.nodes.get(edge.source)?.label,
              " ",
              edge.directed ? "\u2192" : "\u2194",
              " ",
              index.nodes.get(edge.target)?.label
            ] }),
            /* @__PURE__ */ jsx8("small", { children: typeof explanation === "string" ? explanation : "Explicit relationship supplied in the loaded projection." }),
            /* @__PURE__ */ jsxs7("small", { children: [
              "Evidence: ",
              edge.evidence.origin
            ] })
          ] }, edge.id);
        }),
        !(direction === "outgoing" ? outgoing : incoming).length && /* @__PURE__ */ jsxs7("p", { className: "brain-help", children: [
          "No known ",
          direction,
          " connection in this loaded projection."
        ] })
      ] }, direction)),
      inspectorOptions.showDirectedPaths && /* @__PURE__ */ jsxs7("div", { className: "brain-field", children: [
        /* @__PURE__ */ jsx8("label", { htmlFor: `${id}-path`, children: "Directed path to another entity" }),
        /* @__PURE__ */ jsxs7("select", { id: `${id}-path`, value: pathTarget, onChange: (event) => {
          setPathTarget(event.target.value);
          setPathMessage("");
        }, children: [
          /* @__PURE__ */ jsx8("option", { value: "", children: "Choose endpoint" }),
          graph.nodes.filter((other) => other.id !== node.id).slice(0, 1e3).map((other) => /* @__PURE__ */ jsx8("option", { value: other.id, children: other.label }, other.id))
        ] }),
        /* @__PURE__ */ jsx8("button", { className: "brain-button", disabled: !pathTarget, onClick: () => {
          const path = findDirectedPath(index, node.id, pathTarget);
          setPathMessage(path ? `${path.length} explicit directed edge${path.length === 1 ? "" : "s"}: ${[node.label, ...path.map((edge) => index.nodes.get(edge.target)?.label)].join(" \u2192 ")}` : "No known directed path in this loaded projection. This does not prove no connection exists.");
          if (path?.length) {
            store.setEdge(path[0].id);
            camera.send({ type: "focus", nodeIds: [node.id, pathTarget] });
          }
        }, children: "Find loaded path" }),
        /* @__PURE__ */ jsx8("p", { className: "brain-help", role: "status", children: pathMessage })
      ] })
    ] }) }),
    (showContextActions && node.canonicalRef || renderNodeActions || inspectorOptions.showMetadataFooter) && /* @__PURE__ */ jsxs7("div", { className: "brain-inspector-footer", children: [
      showContextActions && node.canonicalRef && /* @__PURE__ */ jsxs7("button", { className: "brain-button brain-button-primary", disabled: tray.includes(node.id), onClick: () => store.addToTray(node.id), children: [
        /* @__PURE__ */ jsx8(Icon, { name: tray.includes(node.id) ? "check" : "plus" }),
        tray.includes(node.id) ? "Added to context" : "Add to context"
      ] }),
      renderNodeActions?.(node),
      inspectorOptions.showMetadataFooter && /* @__PURE__ */ jsx8("span", { className: "brain-muted", children: labels.metadataFooter })
    ] })
  ] });
}

// src/react/components/BrainLegend.tsx
import { jsx as jsx9, jsxs as jsxs8 } from "react/jsx-runtime";
function BrainLegend() {
  const { graph, nodeStyle, nodeSize, projection, view, selectedNodeId } = useBrain();
  const kinds = [...new Set(graph.nodes.map((node) => node.kind))];
  const focused = projection.nodes.length > 120;
  const edgeCount = focused ? projection.edges.filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId).length : Math.min(600, projection.edges.length);
  return /* @__PURE__ */ jsxs8("div", { className: "brain-legend", children: [
    /* @__PURE__ */ jsx9("div", { className: "brain-legend-kinds", children: kinds.slice(0, 5).map((kind) => /* @__PURE__ */ jsxs8("span", { children: [
      /* @__PURE__ */ jsx9(KindGlyph, { style: nodeStyle(graph.nodes.find((node) => node.kind === kind)) }),
      nodeStyle(graph.nodes.find((node) => node.kind === kind)).label
    ] }, kind)) }),
    /* @__PURE__ */ jsxs8("span", { className: "brain-size-legend", children: [
      /* @__PURE__ */ jsx9("i", {}),
      /* @__PURE__ */ jsx9("i", {}),
      /* @__PURE__ */ jsx9("i", {}),
      "Size: ",
      nodeSize.metric === "loadedDegree" ? "unique incident edges in loaded graph" : nodeSize.metric === "targetTokens" ? "target tokens" : nodeSize.metric === "contentBytes" ? "content bytes" : nodeSize.metric,
      "; small = unknown"
    ] }),
    /* @__PURE__ */ jsxs8("span", { className: "brain-edge-disclosure", children: [
      edgeCount,
      " / ",
      projection.edges.length,
      " edges shown",
      focused ? " \xB7 focused" : "",
      " \xB7 ",
      view.quality,
      " quality"
    ] })
  ] });
}

// src/react/components/BrainContextTray.tsx
import { useState as useState6 } from "react";
import { jsx as jsx10, jsxs as jsxs9 } from "react/jsx-runtime";
function BrainContextTray({ onPreview, previewLabel = "Preview composition", simulated = false }) {
  const { tray, index, store, select } = useBrain();
  const [expanded, setExpanded] = useState6(false), [busy, setBusy] = useState6(false), [message, setMessage] = useState6("");
  const { nodeStyle } = useBrain();
  return /* @__PURE__ */ jsxs9("section", { className: `brain-tray ${expanded ? "is-expanded" : ""}`, "aria-label": "Selected context tray", children: [
    /* @__PURE__ */ jsxs9("div", { className: "brain-tray-header", children: [
      /* @__PURE__ */ jsxs9("button", { className: "brain-tray-toggle", "aria-expanded": expanded, onClick: () => setExpanded(!expanded), children: [
        /* @__PURE__ */ jsx10(Icon, { name: "layers" }),
        /* @__PURE__ */ jsx10("strong", { children: "Context tray" }),
        /* @__PURE__ */ jsx10("span", { className: "brain-small-badge", children: tray.length }),
        /* @__PURE__ */ jsx10(Icon, { name: expanded ? "down" : "up" })
      ] }),
      /* @__PURE__ */ jsx10("span", { className: "brain-tray-hint", children: tray.length ? "Local selection \xB7 display order only" : "Select a node to start composing" }),
      simulated && /* @__PURE__ */ jsx10("span", { className: "brain-simulation-badge", children: "Simulated" }),
      /* @__PURE__ */ jsxs9("button", { className: "brain-button brain-tray-preview", disabled: busy || !tray.length || !onPreview, title: !onPreview ? "Unsupported: the host has not supplied a preview callback" : void 0, onClick: async () => {
        if (!onPreview) return;
        setBusy(true);
        setMessage("");
        try {
          await onPreview(tray.flatMap((id) => {
            const ref = index.nodes.get(id)?.canonicalRef;
            return ref ? [ref] : [];
          }));
          setMessage(simulated ? "Simulated scenario applied. No generation request was made." : "Host preview callback completed.");
        } catch {
          setMessage("Preview unavailable. No successful result is assumed.");
        } finally {
          setBusy(false);
        }
      }, children: [
        /* @__PURE__ */ jsx10(Icon, { name: "play" }),
        busy ? "Preparing\u2026" : previewLabel
      ] })
    ] }),
    expanded && /* @__PURE__ */ jsxs9("div", { className: "brain-tray-content", children: [
      !tray.length ? /* @__PURE__ */ jsx10("p", { className: "brain-help", children: "Add caller-selectable references using the inspector. This local tray does not modify stored context or compiler ordering." }) : /* @__PURE__ */ jsx10("ol", { children: tray.map((id, position) => {
        const node = index.nodes.get(id);
        if (!node) return null;
        return /* @__PURE__ */ jsxs9("li", { children: [
          /* @__PURE__ */ jsx10(KindGlyph, { style: nodeStyle(node) }),
          /* @__PURE__ */ jsx10("button", { className: "brain-text-button", onClick: () => select(id), children: node.label }),
          /* @__PURE__ */ jsx10("code", { children: node.canonicalRef }),
          /* @__PURE__ */ jsx10("button", { className: "brain-icon-button", "aria-label": `Move ${node.label} earlier`, disabled: position === 0, onClick: () => store.reorderTray(id, -1), children: /* @__PURE__ */ jsx10(Icon, { name: "up" }) }),
          /* @__PURE__ */ jsx10("button", { className: "brain-icon-button", "aria-label": `Move ${node.label} later`, disabled: position === tray.length - 1, onClick: () => store.reorderTray(id, 1), children: /* @__PURE__ */ jsx10(Icon, { name: "down" }) }),
          /* @__PURE__ */ jsx10("button", { className: "brain-icon-button", "aria-label": `Remove ${node.label} from context`, onClick: () => store.removeFromTray(id), children: /* @__PURE__ */ jsx10(Icon, { name: "close" }) })
        ] }, id);
      }) }),
      !onPreview && /* @__PURE__ */ jsx10("p", { className: "brain-help", children: "Preview unsupported: no host callback supplied." })
    ] }),
    message && /* @__PURE__ */ jsx10("p", { role: "status", className: "brain-tray-message", children: message })
  ] });
}

// src/react/components/BrainResolutionPanel.tsx
import { useState as useState7 } from "react";
import { Fragment as Fragment2, jsx as jsx11, jsxs as jsxs10 } from "react/jsx-runtime";
function BrainResolutionPanel({ illustrative = false, controls }) {
  const { observation, graph, select, store } = useBrain();
  const [expanded, setExpanded] = useState7(true), [stage, setStage] = useState7(0);
  if (!illustrative && !observation && !controls) return null;
  const matches = observation ? matchObservation(graph, observation) : [];
  return /* @__PURE__ */ jsxs10("section", { className: "brain-resolution-panel", "aria-label": illustrative ? "Illustrative conceptual pipeline" : "Resolution observation", children: [
    /* @__PURE__ */ jsxs10("div", { className: "brain-resolution-heading", children: [
      /* @__PURE__ */ jsxs10("button", { "aria-expanded": expanded, onClick: () => setExpanded(!expanded), children: [
        /* @__PURE__ */ jsx11(Icon, { name: expanded ? "down" : "right" }),
        /* @__PURE__ */ jsx11("strong", { children: illustrative ? "Illustrative sequence" : "Resolution receipt" })
      ] }),
      (illustrative || observation?.simulated) && /* @__PURE__ */ jsx11("span", { className: "brain-simulation-badge", children: illustrative ? "Not live telemetry" : "Simulated" }),
      observation && !illustrative && /* @__PURE__ */ jsx11("button", { className: "brain-icon-button", "aria-label": "Clear observation", onClick: () => store.setObservation(null), children: /* @__PURE__ */ jsx11(Icon, { name: "close" }) })
    ] }),
    expanded && /* @__PURE__ */ jsxs10("div", { className: "brain-resolution-content", children: [
      controls,
      illustrative ? /* @__PURE__ */ jsxs10(Fragment2, { children: [
        /* @__PURE__ */ jsx11("p", { className: "brain-help", children: "Illustrative sequence, not live execution telemetry. Policy checks can recur during expansion." }),
        /* @__PURE__ */ jsx11("ol", { className: "brain-pipeline", children: illustrativeStages.map((item, i) => /* @__PURE__ */ jsxs10("li", { children: [
          /* @__PURE__ */ jsx11("button", { "aria-current": i === stage ? "step" : void 0, onClick: () => setStage(i), children: item.label }),
          i < illustrativeStages.length - 1 && /* @__PURE__ */ jsx11(Icon, { name: "right" })
        ] }, item.label)) }),
        /* @__PURE__ */ jsx11("p", { children: illustrativeStages[stage].description }),
        /* @__PURE__ */ jsxs10("div", { className: "brain-pipeline-controls", children: [
          /* @__PURE__ */ jsx11("button", { className: "brain-button", disabled: stage === 0, onClick: () => setStage(stage - 1), children: "Previous stage" }),
          /* @__PURE__ */ jsxs10("span", { children: [
            stage + 1,
            " / ",
            illustrativeStages.length
          ] }),
          /* @__PURE__ */ jsx11("button", { className: "brain-button", disabled: stage === illustrativeStages.length - 1, onClick: () => setStage(stage + 1), children: "Next stage" })
        ] })
      ] }) : observation ? /* @__PURE__ */ jsx11(Fragment2, { children: observation.status === "failure" ? /* @__PURE__ */ jsxs10("div", { className: "brain-notice brain-notice-error", children: [
        /* @__PURE__ */ jsxs10("strong", { children: [
          "Resolution failed \xB7 ",
          observation.failure
        ] }),
        /* @__PURE__ */ jsx11("p", { children: "No successful partial result. No receipt or inaccessible-resource inventory is inferred." })
      ] }) : /* @__PURE__ */ jsxs10(Fragment2, { children: [
        /* @__PURE__ */ jsxs10("div", { className: "brain-receipt-stats", children: [
          /* @__PURE__ */ jsxs10("span", { children: [
            /* @__PURE__ */ jsx11("small", { children: "Compiled tokens" }),
            /* @__PURE__ */ jsx11("strong", { children: observation.receipt.compiledTokenCount?.toLocaleString() ?? "Unknown" })
          ] }),
          /* @__PURE__ */ jsxs10("span", { children: [
            /* @__PURE__ */ jsx11("small", { children: "Accounting" }),
            /* @__PURE__ */ jsx11("strong", { children: observation.receipt.tokenBudgetCheckDeferred ? "Deferred" : "Reported" })
          ] }),
          /* @__PURE__ */ jsxs10("span", { children: [
            /* @__PURE__ */ jsx11("small", { children: "Evidence origin" }),
            /* @__PURE__ */ jsx11("strong", { children: observation.origin })
          ] })
        ] }),
        /* @__PURE__ */ jsx11("p", { className: "brain-help", children: observation.origin === "public-generation" ? "Public generation receipts do not establish retained sections or per-section redaction." : observation.origin === "public-resolve" ? "Resolved references are not per-section inclusion or redaction evidence." : "Explicit host-supplied full internal receipt \xB7 richer than public API receipts." }),
        /* @__PURE__ */ jsxs10("p", { className: "brain-help", children: [
          "Receipt: ",
          /* @__PURE__ */ jsx11("time", { dateTime: observation.receipt.compiledAt, children: observation.receipt.compiledAt.replace("T", " ").replace("Z", " UTC") }),
          " \xB7 graph snapshot: ",
          observation.association.graphRevision,
          observation.association.graphRevision !== graph.revision ? " \xB7 snapshot differs; only exact version/hash matches are colored" : ""
        ] }),
        /* @__PURE__ */ jsx11("ul", { className: "brain-outcomes", children: matches.map((match, i) => /* @__PURE__ */ jsxs10("li", { children: [
          /* @__PURE__ */ jsxs10("span", { className: `brain-outcome-label is-${match.section.outcome}`, children: [
            match.section.outcome === "included" ? "\u2713" : match.section.outcome === "dropped" ? "\u2212" : "\u2192",
            " ",
            match.section.outcome
          ] }),
          /* @__PURE__ */ jsx11("button", { className: "brain-text-button", disabled: !match.nodeId, onClick: () => match.nodeId && select(match.nodeId), children: match.nodeId ? graph.nodes.find((node) => node.id === match.nodeId)?.label : match.section.sourceRef }),
          /* @__PURE__ */ jsxs10("span", { children: [
            match.section.version ?? "Version unknown",
            " \xB7 ",
            match.reason === "matched" ? match.section.redactionApplied === null ? "redaction unknown" : match.section.redactionApplied ? "redaction applied" : "no redaction" : `Unmatched: ${match.reason}`
          ] })
        ] }, i)) }),
        !matches.length && /* @__PURE__ */ jsx11("p", { className: "brain-help", children: "No per-section outcomes supplied. Inclusion and redaction remain unknown." }),
        /* @__PURE__ */ jsxs10("details", { className: "brain-receipt-evidence", children: [
          /* @__PURE__ */ jsx11("summary", { children: "Receipt evidence" }),
          /* @__PURE__ */ jsxs10("dl", { children: [
            /* @__PURE__ */ jsx11("dt", { children: "Trace ID" }),
            /* @__PURE__ */ jsx11("dd", { children: /* @__PURE__ */ jsx11("code", { children: observation.receipt.traceId }) }),
            /* @__PURE__ */ jsx11("dt", { children: "Supplied compilation hash" }),
            /* @__PURE__ */ jsx11("dd", { children: /* @__PURE__ */ jsx11("code", { children: observation.receipt.compilationHash }) }),
            /* @__PURE__ */ jsx11("dt", { children: "Target model alias" }),
            /* @__PURE__ */ jsx11("dd", { children: observation.receipt.targetModelAlias }),
            observation.receipt.contextParamsDigest && /* @__PURE__ */ jsxs10(Fragment2, { children: [
              /* @__PURE__ */ jsx11("dt", { children: "Parameter digest" }),
              /* @__PURE__ */ jsx11("dd", { children: /* @__PURE__ */ jsx11("code", { children: observation.receipt.contextParamsDigest }) })
            ] })
          ] })
        ] })
      ] }) }) : /* @__PURE__ */ jsx11("p", { className: "brain-help", children: "Choose an externally supplied observation. No generation calls are made by this library." })
    ] })
  ] });
}

// src/react/hooks.ts
import { useCallback as useCallback2, useEffect as useEffect4, useRef as useRef4, useState as useState8 } from "react";
function useExplorerFullscreen(ref) {
  const [mode, setMode] = useState8("none");
  const previousFocus = useRef4(null);
  const exit = useCallback2(async () => {
    if (document.fullscreenElement === ref.current) {
      try {
        await document.exitFullscreen();
      } catch {
        setMode("none");
      }
    } else setMode("none");
  }, [ref]);
  const enter = useCallback2(async (overlayOnly = false) => {
    const element = ref.current;
    if (!element) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!overlayOnly && typeof element.requestFullscreen === "function" && document.fullscreenEnabled) {
      try {
        await element.requestFullscreen();
        setMode("native");
        if (document.activeElement === previousFocus.current || !element.contains(document.activeElement)) element.focus();
        return;
      } catch {
      }
    }
    setMode("overlay");
    element.focus();
  }, [ref]);
  useEffect4(() => {
    const changed = () => {
      if (document.fullscreenElement === ref.current) setMode("native");
      else setMode((current) => current === "native" ? "none" : current);
    };
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, [ref]);
  useEffect4(() => {
    if (mode === "none") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = ref.current;
    const trap = (event) => {
      if (mode !== "overlay" || event.key !== "Tab" || !root) return;
      const items = [...root.querySelectorAll('button:not(:disabled),input,select,a[href],[tabindex="0"]')].filter((element) => element.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    root?.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = previousOverflow;
      root?.removeEventListener("keydown", trap);
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
    };
  }, [mode, ref]);
  return { mode, enter, exit };
}

// src/react/BrainExplorer.tsx
import { Fragment as Fragment3, jsx as jsx12, jsxs as jsxs11 } from "react/jsx-runtime";
var BrainExplorer = forwardRef(function BrainExplorer2(props, ref) {
  return /* @__PURE__ */ jsx12(BrainProvider, { ...props, defaultView: props.defaultView ?? { renderer: props.renderer ?? "auto", layout: props.layout ?? "brain", quality: "high" }, children: /* @__PURE__ */ jsx12(BrainExplorerShell, { ...props, renderer: void 0, layout: void 0, controllerRef: ref }) });
});
function BrainExplorerShell(props) {
  const brain = useBrain();
  const { graph, filters, store, select, selectedNodeId, selectedEdgeId, index, projection, camera, view } = brain;
  const root = useRef5(null), search = useRef5(null), navTrigger = useRef5(null), listTrigger = useRef5(null), drawer = useRef5(null);
  const fullscreen = useExplorerFullscreen(root);
  const [navigatorOpen, setNavigatorOpen] = useState9(props.defaultNavigatorOpen ?? true), [listOpen, setListOpen] = useState9(false), [mode, setMode] = useState9("inventory");
  const [size, setSize] = useState9({ width: 1400, height: 760 }), [hydrated, setHydrated] = useState9(false);
  const compact = props.variant !== "embedded" && fullscreen.mode === "none" && (size.width < 500 || size.height < 340), narrow = size.width < 960;
  const searchId = useId5(), selected = selectedNodeId ? index.nodes.get(selectedNodeId) : null;
  const currentMode = props.mode ?? mode;
  const setModeValue = (value) => {
    setMode(value);
    props.onModeChange?.(value);
  };
  useImperativeHandle(props.controllerRef, () => ({ focusNode: select, fit: () => camera.send({ type: "fit" }), resetCamera: () => camera.send({ type: "reset" }), rotate: (yaw, pitch) => camera.send({ type: "rotate", yaw, pitch }) }), [select, camera]);
  useEffect5(() => {
    setHydrated(true);
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => setSize({ width: entries[0].contentRect.width, height: entries[0].contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect5(() => {
    if (narrow) setNavigatorOpen(false);
  }, [narrow]);
  useEffect5(() => {
    if (!listOpen && !(narrow && navigatorOpen)) return;
    const element = drawer.current, previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.querySelector("button,input")?.focus();
    const trap = (event) => {
      if (event.key !== "Tab" || !element) return;
      const items = [...element.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')].filter((item) => item.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    element?.addEventListener("keydown", trap);
    return () => {
      element?.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [listOpen, narrow, navigatorOpen]);
  const results = filters.query ? graph.nodes.filter((node) => `${node.label} ${node.canonicalRef ?? ""}`.toLocaleLowerCase().includes(filters.query.toLocaleLowerCase())).slice(0, 8) : [];
  const searchSelect = (id) => {
    store.setFilters({ ...filters, query: "" });
    select(id);
    root.current?.querySelector(".brain-viewport")?.focus();
  };
  const edge = graph.edges.find((item) => item.id === selectedEdgeId);
  return /* @__PURE__ */ jsxs11(
    "div",
    {
      ref: root,
      className: `brain-explorer ${props.variant === "embedded" ? "brain-embedded" : ""} ${props.className ?? ""} ${compact ? "brain-compact" : ""} ${narrow ? "brain-narrow" : ""} ${fullscreen.mode === "overlay" ? "brain-expanded-overlay" : ""}`,
      "data-theme": props.theme ?? "dark",
      "data-ready": hydrated,
      "data-fullscreen": fullscreen.mode,
      style: props.style,
      tabIndex: -1,
      role: fullscreen.mode === "overlay" ? "dialog" : "region",
      "aria-modal": fullscreen.mode === "overlay" ? true : void 0,
      "aria-label": fullscreen.mode === "overlay" ? "Expanded explorer overlay, not native fullscreen" : "Brain Explorer",
      onPointerDownCapture: (event) => {
        if (!event.target.closest(".brain-auto-rotate")) camera.pause();
      },
      onKeyDownCapture: (event) => {
        if (!event.target.closest(".brain-auto-rotate")) camera.pause();
      },
      onKeyDown: (event) => {
        if (event.key === "/" && !event.target.closest("input,textarea,select,[contenteditable=true]")) {
          event.preventDefault();
          search.current?.focus();
          return;
        }
        if (event.key !== "Escape") return;
        if (filters.query) {
          event.preventDefault();
          store.setFilters({ ...filters, query: "" });
          search.current?.focus();
        } else if (listOpen) {
          event.preventDefault();
          setListOpen(false);
          listTrigger.current?.focus();
        } else if (narrow && navigatorOpen) {
          event.preventDefault();
          setNavigatorOpen(false);
          navTrigger.current?.focus();
        } else if (selectedNodeId && !compact) {
          event.preventDefault();
          select(null);
          root.current?.querySelector(".brain-viewport")?.focus();
        } else if (fullscreen.mode !== "none") {
          event.preventDefault();
          void fullscreen.exit();
        }
      },
      children: [
        /* @__PURE__ */ jsxs11("div", { className: "brain-explorer-topbar", children: [
          /* @__PURE__ */ jsxs11("div", { className: "brain-topbar-leading", children: [
            /* @__PURE__ */ jsx12("button", { ref: navTrigger, className: "brain-icon-button", "aria-label": navigatorOpen ? "Hide context navigator" : "Show context navigator", "aria-expanded": navigatorOpen, onClick: () => setNavigatorOpen(!navigatorOpen), children: /* @__PURE__ */ jsx12(Icon, { name: "panel" }) }),
            props.toolbarStart ?? /* @__PURE__ */ jsxs11("span", { className: "brain-default-title", children: [
              /* @__PURE__ */ jsx12(Icon, { name: "cube" }),
              "Brain Explorer"
            ] })
          ] }),
          /* @__PURE__ */ jsxs11("div", { className: "brain-search-container", children: [
            /* @__PURE__ */ jsxs11("label", { className: "brain-search", htmlFor: searchId, children: [
              /* @__PURE__ */ jsx12(Icon, { name: "search" }),
              /* @__PURE__ */ jsx12("input", { ref: search, id: searchId, "aria-label": "Search loaded context", placeholder: "Search loaded context\u2026", autoComplete: "off", value: filters.query, onChange: (event) => store.setFilters({ ...filters, query: event.target.value }), onKeyDown: (event) => {
                if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                if (event.key === "Enter" && results[0]) {
                  event.preventDefault();
                  searchSelect(results[0].id);
                }
              } }),
              /* @__PURE__ */ jsx12("kbd", { children: "/" })
            ] }),
            filters.query && /* @__PURE__ */ jsxs11("div", { className: "brain-search-results", children: [
              /* @__PURE__ */ jsx12("p", { children: results.length ? "Matching loaded entities" : "No matches in loaded context" }),
              /* @__PURE__ */ jsx12("ul", { children: results.map((node) => /* @__PURE__ */ jsx12("li", { children: /* @__PURE__ */ jsxs11("button", { onClick: () => searchSelect(node.id), children: [
                /* @__PURE__ */ jsx12("strong", { children: node.label }),
                /* @__PURE__ */ jsxs11("span", { children: [
                  node.kind,
                  " \xB7 ",
                  node.version ?? "unknown version"
                ] })
              ] }) }, node.id)) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs11("div", { className: "brain-topbar-trailing", children: [
            /* @__PURE__ */ jsxs11("label", { className: "brain-mode-select", children: [
              /* @__PURE__ */ jsx12("span", { className: "brain-sr-only", children: "Explorer mode" }),
              /* @__PURE__ */ jsxs11("select", { value: currentMode, onChange: (event) => setModeValue(event.target.value), children: [
                /* @__PURE__ */ jsx12("option", { value: "inventory", children: "Inventory" }),
                /* @__PURE__ */ jsx12("option", { value: "composition", children: "Composition" }),
                /* @__PURE__ */ jsx12("option", { value: "receipt", children: "Receipt" }),
                /* @__PURE__ */ jsx12("option", { value: "illustrative", children: "Illustrative" })
              ] })
            ] }),
            props.toolbarEnd,
            /* @__PURE__ */ jsx12("button", { className: "brain-icon-button brain-fullscreen-button", "aria-label": fullscreen.mode === "none" ? "Enter fullscreen" : "Exit fullscreen", title: fullscreen.mode === "overlay" ? "Exit expanded overlay" : "Fullscreen", onClick: () => fullscreen.mode === "none" ? void fullscreen.enter() : void fullscreen.exit(), children: /* @__PURE__ */ jsx12(Icon, { name: fullscreen.mode === "none" ? "expand" : "close" }) })
          ] }),
          compact && /* @__PURE__ */ jsxs11("button", { className: "brain-button brain-open-explorer", onClick: () => void fullscreen.enter(true), children: [
            /* @__PURE__ */ jsx12(Icon, { name: "expand" }),
            "Open explorer"
          ] })
        ] }),
        fullscreen.mode === "overlay" && /* @__PURE__ */ jsxs11("div", { className: "brain-overlay-label", children: [
          "Expanded overlay \xB7 not native fullscreen ",
          /* @__PURE__ */ jsx12("button", { className: "brain-text-button", onClick: () => void fullscreen.exit(), children: "Exit overlay" })
        ] }),
        /* @__PURE__ */ jsxs11("div", { className: "brain-workspace", children: [
          navigatorOpen && !compact && /* @__PURE__ */ jsxs11(Fragment3, { children: [
            narrow && /* @__PURE__ */ jsx12("button", { className: "brain-drawer-scrim", "aria-label": "Dismiss navigator", onClick: () => setNavigatorOpen(false) }),
            /* @__PURE__ */ jsx12("div", { className: narrow ? "brain-mobile-drawer" : "brain-navigator-container", ref: narrow ? drawer : void 0, role: narrow ? "dialog" : void 0, "aria-modal": narrow ? true : void 0, "aria-label": "Context navigator", children: /* @__PURE__ */ jsx12(BrainTierNavigator, { onClose: () => {
              setNavigatorOpen(false);
              navTrigger.current?.focus();
            } }) })
          ] }),
          /* @__PURE__ */ jsxs11("div", { className: "brain-center", children: [
            /* @__PURE__ */ jsxs11("div", { className: "brain-viewbar", children: [
              /* @__PURE__ */ jsxs11("div", { className: "brain-view-tabs", role: "group", "aria-label": "Graph layout", children: [
                /* @__PURE__ */ jsxs11("button", { className: view.layout === "brain" ? "is-active" : "", "aria-pressed": view.layout === "brain", onClick: () => store.setView({ ...view, layout: "brain" }), children: [
                  /* @__PURE__ */ jsx12(Icon, { name: "cube" }),
                  /* @__PURE__ */ jsx12("span", { children: "Brain view" })
                ] }),
                /* @__PURE__ */ jsxs11("button", { className: view.layout === "cluster" ? "is-active" : "", "aria-pressed": view.layout === "cluster", onClick: () => store.setView({ ...view, layout: "cluster" }), children: [
                  /* @__PURE__ */ jsx12(Icon, { name: "link" }),
                  /* @__PURE__ */ jsx12("span", { children: "Graph view" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs11("div", { className: "brain-view-options", children: [
                /* @__PURE__ */ jsxs11("label", { children: [
                  /* @__PURE__ */ jsx12("span", { className: "brain-sr-only", children: "Renderer" }),
                  /* @__PURE__ */ jsxs11("select", { "aria-label": "Renderer", value: props.renderer ?? view.renderer, onChange: (event) => store.setView({ ...view, renderer: event.target.value }), children: [
                    /* @__PURE__ */ jsx12("option", { value: "auto", children: "Auto \xB7 3D" }),
                    /* @__PURE__ */ jsx12("option", { value: "webgl", children: "3D WebGL" }),
                    /* @__PURE__ */ jsx12("option", { value: "svg", children: "2D graph" }),
                    /* @__PURE__ */ jsx12("option", { value: "list", children: "Accessible list" })
                  ] })
                ] }),
                /* @__PURE__ */ jsx12("button", { ref: listTrigger, className: "brain-icon-button", "aria-label": "Open accessible node list", title: "Accessible node list", onClick: () => setListOpen(true), children: /* @__PURE__ */ jsx12(Icon, { name: "list" }) })
              ] })
            ] }),
            /* @__PURE__ */ jsxs11("div", { className: "brain-stage", children: [
              /* @__PURE__ */ jsx12(BrainViewport, { renderer: props.renderer, layout: props.layout, forceWebGLFailure: props.forceWebGLFailure, loadingSlot: props.loadingSlot, emptySlot: props.emptySlot, errorSlot: props.errorSlot, unsupportedSlot: props.unsupportedSlot, renderExtraWebGL: props.renderExtraWebGL }),
              view.renderer !== "list" && /* @__PURE__ */ jsxs11(Fragment3, { children: [
                /* @__PURE__ */ jsxs11("div", { className: "brain-canvas-caption", children: [
                  /* @__PURE__ */ jsx12("span", { className: "brain-eyebrow", children: "Connected knowledge" }),
                  /* @__PURE__ */ jsxs11("span", { children: [
                    projection.nodes.length.toLocaleString(),
                    " visible nodes ",
                    /* @__PURE__ */ jsx12("i", {}),
                    graph.nodes.length.toLocaleString(),
                    " loaded"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs11("div", { className: "brain-drag-hint", children: [
                  /* @__PURE__ */ jsx12("span", { className: "brain-mouse-icon" }),
                  "Drag to ",
                  view.renderer === "svg" ? "pan" : "rotate",
                  /* @__PURE__ */ jsx12("span", { children: "\xB7" }),
                  "Scroll to zoom"
                ] }),
                /* @__PURE__ */ jsx12("div", { className: "brain-canvas-controls", children: /* @__PURE__ */ jsx12(BrainToolbar, {}) })
              ] }),
              edge && /* @__PURE__ */ jsxs11("div", { className: "brain-focused-edge", children: [
                /* @__PURE__ */ jsx12(Icon, { name: "link" }),
                /* @__PURE__ */ jsxs11("span", { children: [
                  index.nodes.get(edge.source)?.label,
                  " ",
                  edge.directed ? "\u2192" : "\u2194",
                  " ",
                  index.nodes.get(edge.target)?.label
                ] }),
                /* @__PURE__ */ jsxs11("span", { children: [
                  edge.kind,
                  " \xB7 ",
                  edge.evidence.origin
                ] })
              ] }),
              compact && selected && /* @__PURE__ */ jsxs11("button", { className: "brain-compact-selection", onClick: () => void fullscreen.enter(true), children: [
                selected.label,
                " \xB7 inspect ",
                /* @__PURE__ */ jsx12(Icon, { name: "right" })
              ] }),
              (currentMode === "receipt" || currentMode === "illustrative") && !compact && /* @__PURE__ */ jsx12("div", { className: "brain-receipt-overlay", children: /* @__PURE__ */ jsx12(BrainResolutionPanel, { illustrative: currentMode === "illustrative", controls: currentMode === "receipt" ? props.receiptControls : void 0 }) })
            ] }),
            /* @__PURE__ */ jsx12(BrainLegend, {}),
            /* @__PURE__ */ jsxs11("div", { className: "brain-spatial-note", children: [
              /* @__PURE__ */ jsx12(Icon, { name: "info" }),
              "Spatial positions are a layout, not semantic similarity."
            ] }),
            props.showContextTray !== false && /* @__PURE__ */ jsx12(BrainContextTray, { onPreview: props.onPreview, previewLabel: props.previewLabel, simulated: props.simulated })
          ] }),
          selectedNodeId && !compact && /* @__PURE__ */ jsx12("div", { className: narrow ? "brain-inspector-mobile" : "brain-inspector-container", children: /* @__PURE__ */ jsx12(BrainInspector, { renderNodeDetails: props.renderNodeDetails, renderNodeActions: props.renderNodeActions, showContextActions: props.showContextActions ?? props.showContextTray !== false, inspectorOptions: props.inspectorOptions, onClose: () => root.current?.querySelector(".brain-viewport")?.focus() }) }),
          listOpen && /* @__PURE__ */ jsxs11(Fragment3, { children: [
            /* @__PURE__ */ jsx12("button", { className: "brain-drawer-scrim", "aria-label": "Dismiss accessible node list", onClick: () => setListOpen(false) }),
            /* @__PURE__ */ jsxs11("div", { className: "brain-list-drawer", ref: drawer, role: "dialog", "aria-modal": "true", "aria-label": "Accessible node list", children: [
              /* @__PURE__ */ jsxs11("div", { className: "brain-panel-heading", children: [
                /* @__PURE__ */ jsx12("span", { children: "Loaded context" }),
                /* @__PURE__ */ jsx12("button", { className: "brain-icon-button", "aria-label": "Close accessible node list", onClick: () => {
                  setListOpen(false);
                  listTrigger.current?.focus();
                }, children: /* @__PURE__ */ jsx12(Icon, { name: "close" }) })
              ] }),
              /* @__PURE__ */ jsx12(BrainAccessibleList, {})
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs11("div", { className: "brain-statusbar", children: [
          /* @__PURE__ */ jsxs11("span", { children: [
            /* @__PURE__ */ jsx12("i", { className: "brain-status-dot" }),
            graph.completeness === "complete" ? "Loaded projection" : "Partial inventory",
            /* @__PURE__ */ jsx12("span", { className: "brain-status-divider", children: "/" }),
            graph.nodes.length.toLocaleString(),
            " nodes",
            /* @__PURE__ */ jsx12("span", { className: "brain-status-divider", children: "/" }),
            graph.edges.length.toLocaleString(),
            " relationships"
          ] }),
          /* @__PURE__ */ jsxs11("span", { children: [
            graph.nodes.length > 1500 && projection.nodes.length < graph.nodes.length ? "Level-of-detail aggregation \xB7 " : "",
            "Scope isolated",
            /* @__PURE__ */ jsx12("span", { className: "brain-status-divider", children: "\xB7" }),
            "Host-authorized projection"
          ] })
        ] }),
        props.children
      ]
    }
  );
}

// src/react/BrainPreview.tsx
import { useEffect as useEffect6, useRef as useRef6 } from "react";
import { jsx as jsx13, jsxs as jsxs12 } from "react/jsx-runtime";
function BrainPreview({
  onExpand,
  expandLabel = "Expand brain",
  label = "Knowledge overview",
  className = "",
  style,
  theme = "dark",
  renderer = "svg",
  layout = "brain",
  ...providerProps
}) {
  const surface = useRef6(null);
  useEffect6(() => {
    if (surface.current) surface.current.inert = true;
  }, []);
  return /* @__PURE__ */ jsx13(
    BrainProvider,
    {
      ...providerProps,
      autoFocus: false,
      nodeSize: providerProps.nodeSize ?? { metric: "targetTokens", scale: "sqrt", min: 1.5, max: 3.5, unknown: 1.5 },
      defaultView: providerProps.defaultView ?? { renderer, layout, quality: "low" },
      children: /* @__PURE__ */ jsxs12(
        "div",
        {
          className: `brain-explorer brain-preview ${className}`,
          "data-theme": theme,
          style,
          role: "region",
          "aria-label": label,
          children: [
            /* @__PURE__ */ jsx13("div", { ref: surface, className: "brain-preview-surface", "aria-hidden": "true", children: /* @__PURE__ */ jsx13(BrainViewport, { renderer, layout, interactive: false, showLabels: false }) }),
            /* @__PURE__ */ jsx13(
              "button",
              {
                type: "button",
                className: "brain-icon-button brain-preview-expand",
                "aria-label": expandLabel,
                title: expandLabel,
                onClick: onExpand,
                children: /* @__PURE__ */ jsx13(Icon, { name: "expand" })
              }
            )
          ]
        }
      )
    }
  );
}

export {
  BrainSvgRenderer,
  BrainAccessibleList,
  BrainViewport,
  BrainToolbar,
  BrainPicker,
  BrainConnectionPicker,
  BrainCopyField,
  BrainKindFilters,
  BrainTierNavigator,
  BrainInspector,
  BrainLegend,
  BrainContextTray,
  BrainResolutionPanel,
  useExplorerFullscreen,
  BrainExplorer,
  BrainExplorerShell,
  BrainPreview
};
