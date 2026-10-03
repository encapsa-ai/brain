"use client";
"use client";
import {
  brainSurface,
  clamp,
  homeCamera,
  loadedDegree,
  matchObservation,
  neighborhood,
  nodeRadius,
  stableHash,
  useBrain,
  useBrainLayout,
  useReducedMotion
} from "../chunk-MXXIXEKJ.js";

// src/renderers/webgl/index.tsx
import { useEffect as useEffect4, useMemo as useMemo3, useRef as useRef3, useState } from "react";
import { Canvas, useFrame as useFrame3 } from "@react-three/fiber";

// src/renderers/webgl/BrainEnvelope.tsx
import { useEffect, useMemo } from "react";
import { BufferGeometry, Color, Float32BufferAttribute } from "three";
import { jsx, jsxs } from "react/jsx-runtime";
function BrainEnvelope({ quality, color }) {
  const geometries = useMemo(() => {
    const points = [], colors = [], lines = [];
    const rows = quality === "high" ? 70 : 40, columns = quality === "high" ? 112 : 64;
    const tint = new Color(color);
    for (const side of [-1, 1]) {
      for (let row = 1; row < rows; row++) for (let col = 0; col < columns; col++) {
        const u = col / columns * Math.PI * 2, v = row / rows * Math.PI;
        const point = brainSurface(u, v, side);
        points.push(...point);
        const brightness = 0.48 + 0.26 * (Math.sin(u * 5 + v * 2) * 0.5 + 0.5);
        colors.push(tint.r * brightness, tint.g * brightness, tint.b * brightness);
      }
      for (let row = 1; row < 24; row++) for (let col = 0; col < 100; col++) {
        const v = row / 24 * Math.PI, u = col / 100 * Math.PI * 2;
        lines.push(...brainSurface(u, v, side), ...brainSurface((col + 1) / 100 * Math.PI * 2, v, side));
      }
      for (let col = 0; col < 34; col++) for (let row = 1; row < 65; row++) {
        const u = col / 34 * Math.PI * 2;
        lines.push(...brainSurface(u, row / 66 * Math.PI, side), ...brainSurface(u, (row + 1) / 66 * Math.PI, side));
      }
    }
    const pointGeometry = new BufferGeometry(), lineGeometry = new BufferGeometry();
    pointGeometry.setAttribute("position", new Float32BufferAttribute(points, 3));
    pointGeometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    lineGeometry.setAttribute("position", new Float32BufferAttribute(lines, 3));
    return { pointGeometry, lineGeometry };
  }, [quality, color]);
  useEffect(() => () => {
    geometries.pointGeometry.dispose();
    geometries.lineGeometry.dispose();
  }, [geometries]);
  return /* @__PURE__ */ jsxs("group", { children: [
    /* @__PURE__ */ jsx("points", { geometry: geometries.pointGeometry, raycast: () => null, children: /* @__PURE__ */ jsx("pointsMaterial", { size: quality === "high" ? 0.013 : 0.02, vertexColors: true, transparent: true, opacity: 0.68, sizeAttenuation: true, depthWrite: false, toneMapped: false }) }),
    /* @__PURE__ */ jsx("lineSegments", { geometry: geometries.lineGeometry, raycast: () => null, children: /* @__PURE__ */ jsx("lineBasicMaterial", { color, transparent: true, opacity: 0.1, depthWrite: false, toneMapped: false }) })
  ] });
}

// src/renderers/webgl/GraphGeometry.tsx
import { useEffect as useEffect2, useLayoutEffect, useMemo as useMemo2, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry as BufferGeometry2, Color as Color2, Float32BufferAttribute as Float32BufferAttribute2, Object3D, Vector3, Quaternion } from "three";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function InstanceGroup({ nodes, shape, layout, moved, onHover }) {
  const { nodeStyle, select, selectedNodeId, index, nodeSize, observation, graph } = useBrain();
  const mesh = useRef(null), halo = useRef(null);
  const neighbors = useMemo2(() => selectedNodeId ? neighborhood(index, selectedNodeId, 1) : null, [index, selectedNodeId]);
  const matches = useMemo2(() => observation ? matchObservation(graph, observation) : [], [graph, observation]);
  useLayoutEffect(() => {
    if (!mesh.current || !halo.current) return;
    const object = new Object3D();
    nodes.forEach((node, i) => {
      const position = layout.positions[node.id];
      if (!position) return;
      const id = node.canonicalId ?? node.id, radius = nodeRadius(node, nodeSize, loadedDegree(index, id)) / 95;
      object.position.set(...position);
      object.rotation.set(shape === "hexagon" ? Math.PI / 2 : 0, 0, shape === "square" ? 0.2 : 0);
      object.scale.setScalar(radius);
      object.updateMatrix();
      mesh.current.setMatrixAt(i, object.matrix);
      const match = matches.find((result) => result.nodeId === id);
      const style = nodeStyle(node), color = new Color2(match?.section.outcome === "included" ? "#74d5a1" : match?.section.outcome === "dropped" ? "#e8bd72" : style.color);
      if (neighbors && !neighbors.has(id) && node.kind !== "aggregate") color.multiplyScalar(0.47);
      mesh.current.setColorAt(i, color);
      object.scale.setScalar(radius * (id === selectedNodeId ? 3.1 : 2.25));
      object.updateMatrix();
      halo.current.setMatrixAt(i, object.matrix);
      halo.current.setColorAt(i, color);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    halo.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    if (halo.current.instanceColor) halo.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
    halo.current.computeBoundingSphere();
  }, [nodes, layout, selectedNodeId, neighbors, matches, nodeSize, index, nodeStyle, shape]);
  const pick = (event) => {
    event.stopPropagation();
    if (moved.current || event.delta > 5 || event.instanceId === void 0) return;
    select(nodes[event.instanceId].id);
  };
  return /* @__PURE__ */ jsxs2("group", { children: [
    /* @__PURE__ */ jsxs2("instancedMesh", { ref: mesh, args: [void 0, void 0, nodes.length], onClick: pick, onPointerOver: (event) => {
      event.stopPropagation();
      if (event.instanceId !== void 0) onHover(nodes[event.instanceId].id);
    }, onPointerOut: () => onHover(null), children: [
      shape === "diamond" ? /* @__PURE__ */ jsx2("octahedronGeometry", { args: [1.2, 0] }) : shape === "square" ? /* @__PURE__ */ jsx2("boxGeometry", { args: [1.6, 1.6, 1.2] }) : shape === "hexagon" ? /* @__PURE__ */ jsx2("cylinderGeometry", { args: [1.2, 1.2, 0.72, 6] }) : /* @__PURE__ */ jsx2("sphereGeometry", { args: [0.8, 10, 8] }),
      /* @__PURE__ */ jsx2("meshBasicMaterial", { toneMapped: false })
    ] }),
    /* @__PURE__ */ jsxs2("instancedMesh", { ref: halo, args: [void 0, void 0, nodes.length], raycast: () => null, children: [
      /* @__PURE__ */ jsx2("sphereGeometry", { args: [1, 8, 6] }),
      /* @__PURE__ */ jsx2("meshBasicMaterial", { transparent: true, opacity: 0.075, depthWrite: false, toneMapped: false })
    ] })
  ] });
}
function GraphNodes({ layout, moved, onHover }) {
  const { projection, nodeStyle, selectedNodeId } = useBrain();
  const grouped = useMemo2(() => {
    const map = /* @__PURE__ */ new Map();
    for (const node of projection.nodes) {
      const shape = nodeStyle(node).shape;
      map.set(shape, [...map.get(shape) ?? [], node]);
    }
    return map;
  }, [projection, nodeStyle]);
  const position = selectedNodeId ? layout.positions[projection.canonicalToVisible.get(selectedNodeId) ?? selectedNodeId] : void 0;
  return /* @__PURE__ */ jsxs2("group", { children: [
    [...grouped].map(([shape, nodes]) => /* @__PURE__ */ jsx2(InstanceGroup, { nodes, shape, layout, moved, onHover }, shape)),
    position && /* @__PURE__ */ jsx2(SelectionRing, { position })
  ] });
}
function SelectionRing({ position }) {
  const ref = useRef(null);
  useFrame(({ camera }) => {
    ref.current?.quaternion.copy(camera.quaternion);
  });
  return /* @__PURE__ */ jsxs2("group", { ref, position: [...position], children: [
    /* @__PURE__ */ jsxs2("mesh", { raycast: () => null, children: [
      /* @__PURE__ */ jsx2("ringGeometry", { args: [0.16, 0.174, 40] }),
      /* @__PURE__ */ jsx2("meshBasicMaterial", { color: "#c7fff0", transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false })
    ] }),
    /* @__PURE__ */ jsxs2("mesh", { raycast: () => null, children: [
      /* @__PURE__ */ jsx2("ringGeometry", { args: [0.205, 0.211, 40] }),
      /* @__PURE__ */ jsx2("meshBasicMaterial", { color: "#62d9ca", transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false })
    ] })
  ] });
}
function GraphEdges({ layout }) {
  const { projection, selectedNodeId, selectedEdgeId, edgeStyle } = useBrain();
  const arrowRef = useRef(null);
  const data = useMemo2(() => {
    const positions = [], colors = [], arrows = [];
    const chosen = projection.edges.filter((edge) => projection.nodes.length <= 120 || edge.source === selectedNodeId || edge.target === selectedNodeId || edge.id === selectedEdgeId).slice(0, 600);
    for (const edge of chosen) {
      const source = layout.positions[edge.source], target = layout.positions[edge.target];
      if (!source || !target) continue;
      const focused = edge.source === selectedNodeId || edge.target === selectedNodeId || edge.id === selectedEdgeId || edge.originalEdgeIds?.includes(selectedEdgeId ?? "");
      const base = new Color2(edgeStyle(edge).color), color = base.clone().multiplyScalar(focused ? 0.85 : selectedNodeId ? 0.09 : 0.24);
      const a = new Vector3(...source), b = new Vector3(...target), delta = b.clone().sub(a);
      const self = edge.source === edge.target;
      const normal = delta.clone().cross(new Vector3(0, 0, 1)).normalize().multiplyScalar((stableHash(edge.id) % 9 - 4) * 0.02);
      const segments = self ? 24 : 8;
      const point = (t) => self ? a.clone().add(new Vector3(Math.sin(t * Math.PI * 2) * 0.23, (1 - Math.cos(t * Math.PI * 2)) * 0.23, 0)) : a.clone().lerp(b, t).add(normal.clone().multiplyScalar(Math.sin(t * Math.PI)));
      for (let i = 0; i < segments; i++) {
        if (edgeStyle(edge).dashed && i % 2 === 0 && !focused) continue;
        positions.push(...point(i / segments).toArray(), ...point((i + 1) / segments).toArray());
        colors.push(...color.toArray(), ...color.toArray());
      }
      if (edge.directed && focused) arrows.push({ point: point(0.68), direction: point(0.72).sub(point(0.64)).normalize(), color: base });
    }
    const geometry = new BufferGeometry2();
    geometry.setAttribute("position", new Float32BufferAttribute2(positions, 3));
    geometry.setAttribute("color", new Float32BufferAttribute2(colors, 3));
    return { geometry, arrows };
  }, [projection, layout, selectedNodeId, selectedEdgeId, edgeStyle]);
  useEffect2(() => () => data.geometry.dispose(), [data]);
  useLayoutEffect(() => {
    if (!arrowRef.current) return;
    const object = new Object3D(), up = new Vector3(0, 1, 0);
    for (const [i, arrow] of data.arrows.entries()) {
      object.position.copy(arrow.point);
      object.quaternion.copy(new Quaternion().setFromUnitVectors(up, arrow.direction));
      object.updateMatrix();
      arrowRef.current.setMatrixAt(i, object.matrix);
      arrowRef.current.setColorAt(i, arrow.color);
    }
    arrowRef.current.instanceMatrix.needsUpdate = true;
    if (arrowRef.current.instanceColor) arrowRef.current.instanceColor.needsUpdate = true;
    arrowRef.current.computeBoundingSphere();
  }, [data]);
  return /* @__PURE__ */ jsxs2("group", { children: [
    /* @__PURE__ */ jsx2("lineSegments", { geometry: data.geometry, raycast: () => null, children: /* @__PURE__ */ jsx2("lineBasicMaterial", { vertexColors: true, transparent: true, opacity: 1, toneMapped: false }) }),
    data.arrows.length > 0 && /* @__PURE__ */ jsxs2("instancedMesh", { ref: arrowRef, args: [void 0, void 0, data.arrows.length], raycast: () => null, children: [
      /* @__PURE__ */ jsx2("coneGeometry", { args: [0.037, 0.12, 5] }),
      /* @__PURE__ */ jsx2("meshBasicMaterial", { toneMapped: false })
    ] })
  ] });
}
function updateLabelPosition(element, point, camera, width, height, yOffset = 0) {
  const screen = new Vector3(...point).project(camera);
  const x = (screen.x * 0.5 + 0.5) * width, y = (-screen.y * 0.5 + 0.5) * height + yOffset;
  element.style.transform = `translate(${x}px,${y}px) translate(-50%,0)`;
  element.style.visibility = screen.z > 1 || screen.z < -1 || x < 20 || x > width - 20 || y < 0 || y > height - 25 ? "hidden" : "visible";
  return { x, y };
}

// src/renderers/webgl/CameraRig.tsx
import { useEffect as useEffect3, useRef as useRef2 } from "react";
import { useFrame as useFrame2, useThree } from "@react-three/fiber";
import { Spherical, Vector3 as Vector32, PerspectiveCamera } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
function CameraRig({ layout, active, onReady, onFailure }) {
  const { camera: bus, projection, onDiagnostic } = useBrain(), reduced = useReducedMotion();
  const { camera, gl, invalidate, size, setDpr } = useThree();
  const controls = useRef2(null), transition = useRef2(null);
  const frameTimes = useRef2([]), slowWindows = useRef2(0), lastFrame = useRef2(0);
  const readyRef = useRef2(onReady);
  readyRef.current = onReady;
  const failureRef = useRef2(onFailure);
  failureRef.current = onFailure;
  const activeRef = useRef2(active);
  activeRef.current = active;
  useEffect3(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    controls.current = orbit;
    const state = bus.state;
    camera.position.copy(new Vector32().setFromSpherical(new Spherical(state.distance, state.pitch, state.yaw)).add(new Vector32(...state.target)));
    orbit.target.set(...state.target);
    orbit.enableDamping = !reduced;
    orbit.dampingFactor = 0.11;
    orbit.minPolarAngle = 0.25;
    orbit.maxPolarAngle = Math.PI - 0.25;
    orbit.minDistance = 3.5;
    orbit.maxDistance = 26;
    orbit.enablePan = true;
    orbit.panSpeed = 0.5;
    orbit.rotateSpeed = 0.6;
    orbit.zoomSpeed = 0.7;
    orbit.autoRotateSpeed = 0.5;
    const changed = () => {
      const spherical = new Spherical().setFromVector3(camera.position.clone().sub(orbit.target));
      if (orbit.target.length() > 8) orbit.target.clampLength(0, 8);
      bus.state = { ...bus.state, yaw: spherical.theta, pitch: spherical.phi, distance: spherical.radius, target: [orbit.target.x, orbit.target.y, orbit.target.z] };
      invalidate();
    };
    const started = () => {
      transition.current = null;
      bus.pause();
    };
    orbit.addEventListener("change", changed);
    orbit.addEventListener("start", started);
    orbit.update();
    const unsubscribe = bus.subscribe(() => {
      orbit.autoRotate = bus.autoRotate && activeRef.current;
      invalidate();
    });
    const contextLost = (event) => {
      event.preventDefault();
      failureRef.current?.("context-lost");
    };
    gl.domElement.addEventListener("webglcontextlost", contextLost);
    readyRef.current?.();
    invalidate();
    return () => {
      unsubscribe();
      orbit.removeEventListener("change", changed);
      orbit.removeEventListener("start", started);
      orbit.dispose();
      controls.current = null;
      gl.domElement.removeEventListener("webglcontextlost", contextLost);
    };
  }, [bus, camera, gl, invalidate, reduced]);
  useEffect3(() => {
    if (controls.current) {
      controls.current.enabled = active;
      controls.current.autoRotate = active && bus.autoRotate;
    }
    if (!active) {
      transition.current = null;
      bus.pause();
    } else invalidate();
  }, [active, bus, invalidate]);
  useEffect3(() => bus.onCommand((command) => {
    const orbit = controls.current;
    if (!orbit || !active) return;
    let target = orbit.target.clone(), position = camera.position.clone();
    const spherical = new Spherical().setFromVector3(position.clone().sub(target));
    if (command.type === "reset") {
      target.set(...homeCamera.target);
      spherical.set(homeCamera.distance, homeCamera.pitch, homeCamera.yaw);
    }
    if (command.type === "rotate") {
      spherical.theta += command.yaw;
      spherical.phi = clamp(spherical.phi + command.pitch, 0.25, Math.PI - 0.25);
    }
    if (command.type === "zoom") spherical.radius = clamp(spherical.radius / command.factor, 3.5, 26);
    if (command.type === "fit") {
      const min = new Vector32(...layout.bounds.min), max = new Vector32(...layout.bounds.max), span = max.clone().sub(min);
      target = min.add(max).multiplyScalar(0.5);
      const fov = camera instanceof PerspectiveCamera ? camera.fov : 36;
      spherical.radius = clamp(Math.max(span.y, span.x / Math.max(0.3, size.width / size.height), 2.5) / (2 * Math.tan(fov * Math.PI / 360)) * 1.4, 5, 24);
    }
    if (command.type === "focus") {
      const positions = command.nodeIds.map((id) => layout.positions[projection.canonicalToVisible.get(id) ?? id]).filter(Boolean);
      if (!positions.length) return;
      target = positions.reduce((sum, p) => sum.add(new Vector32(...p)), new Vector32()).divideScalar(positions.length).multiplyScalar(0.32);
      spherical.theta = Math.atan2(target.x, Math.max(1, 4 + target.z));
      spherical.phi = clamp(1.25 - target.y * 0.04, 0.5, 2.5);
    }
    position = new Vector32().setFromSpherical(spherical).add(target);
    if (reduced) {
      orbit.target.copy(target);
      camera.position.copy(position);
      orbit.update();
      transition.current = null;
    } else transition.current = { position, target };
    invalidate();
  }), [active, bus, camera, invalidate, layout, projection, reduced, size]);
  useFrame2((_, delta) => {
    if (!active || !controls.current) return;
    const orbit = controls.current, animation = transition.current;
    if (animation) {
      const amount = 1 - Math.exp(-12 * Math.min(delta, 0.08));
      camera.position.lerp(animation.position, amount);
      orbit.target.lerp(animation.target, amount);
      if (camera.position.distanceTo(animation.position) + orbit.target.distanceTo(animation.target) < 3e-3) transition.current = null;
      invalidate();
    }
    orbit.update();
    if (orbit.autoRotate) invalidate();
    const time = performance.now(), ms = time - lastFrame.current;
    lastFrame.current = time;
    if (ms > 0 && ms < 250 && (orbit.autoRotate || animation)) {
      frameTimes.current.push(ms);
      if (frameTimes.current.length === 90) {
        const sorted = [...frameTimes.current].sort((a, b) => a - b), p95 = sorted[Math.floor(sorted.length * 0.95)];
        onDiagnostic?.({ category: "frame-sample", durationMs: p95, value: sorted[45], nodeCount: projection.nodes.length, edgeCount: projection.edges.length });
        if (p95 > 75) slowWindows.current++;
        else if (p95 < 35) slowWindows.current = Math.max(0, slowWindows.current - 1);
        if (slowWindows.current === 2) setDpr(1);
        if (slowWindows.current >= 4) failureRef.current?.("slow-frames");
        frameTimes.current = [];
      }
    }
  });
  return null;
}

// src/renderers/webgl/index.tsx
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function LabelProjection({ labels, elements, layout, width, height }) {
  useFrame3(({ camera }) => {
    const used = [];
    for (const node of labels) {
      const element = elements.current.get(node.id), point = layout.positions[node.id];
      if (!element || !point) continue;
      let position = updateLabelPosition(element, point, camera, width, height, 17);
      if (used.some((other) => Math.abs(other.x - position.x) < 112 && Math.abs(other.y - position.y) < 28)) position = updateLabelPosition(element, point, camera, width, height, -32);
      if (used.some((other) => Math.abs(other.x - position.x) < 104 && Math.abs(other.y - position.y) < 23)) {
        element.style.visibility = "hidden";
        continue;
      }
      used.push(position);
    }
  });
  return null;
}
function BrainWebGLRenderer({ width, height, active, onReady, onFailure, renderExtra }) {
  const { projection, selectedNodeId, selectedEdgeId, index, select, view, nodeStyle } = useBrain(), layout = useBrainLayout(3);
  const [hover, setHover] = useState(null), root = useRef3(null);
  const labelsRef = useRef3(/* @__PURE__ */ new Map()), moved = useRef3(false), pointerStart = useRef3(null);
  const [envelopeColor, setEnvelopeColor] = useState("#53afa8");
  useEffect4(() => {
    const explorer = root.current?.closest(".brain-explorer");
    if (!explorer) return;
    const read = () => setEnvelopeColor(getComputedStyle(explorer).getPropertyValue("--brain-contour").trim() || "#53afa8");
    read();
    const observer = new MutationObserver(read);
    observer.observe(explorer, { attributes: true });
    return () => observer.disconnect();
  }, []);
  const labels = useMemo3(() => {
    const edge = projection.edges.find((item) => item.id === selectedEdgeId || item.originalEdgeIds?.includes(selectedEdgeId ?? ""));
    const neighbors = selectedNodeId ? neighborhood(index, selectedNodeId, 1) : null;
    const priorities = [...projection.nodes].sort((a, b) => {
      const score = (node) => node.id === selectedNodeId || node.id === hover ? 0 : node.id === edge?.source || node.id === edge?.target ? 1 : node.kind === "aggregate" ? 2 : node.kind === "pack" ? 3 : node.kind === "skill" ? 4 : neighbors?.has(node.id) ? 5 : 9;
      return score(a) - score(b);
    });
    return priorities.filter((node) => ["pack", "skill", "aggregate"].includes(node.kind) || node.id === selectedNodeId || node.id === hover || node.id === edge?.source || node.id === edge?.target || projection.nodes.length < 40 && node.kind !== "page").slice(0, 16);
  }, [projection, selectedNodeId, selectedEdgeId, index, hover]);
  const hovered = projection.nodes.find((node) => node.id === hover);
  return /* @__PURE__ */ jsxs3("div", { className: "brain-webgl", ref: root, "data-renderer": "webgl", onPointerDownCapture: (event) => {
    pointerStart.current = [event.clientX, event.clientY];
    moved.current = false;
  }, onPointerMoveCapture: (event) => {
    if (pointerStart.current && Math.hypot(event.clientX - pointerStart.current[0], event.clientY - pointerStart.current[1]) > 5) moved.current = true;
  }, onPointerUpCapture: () => {
    pointerStart.current = null;
  }, children: [
    /* @__PURE__ */ jsxs3(Canvas, { frameloop: active ? "demand" : "never", dpr: [1, view.quality === "high" ? 1.5 : 1], camera: { position: [0, 3.2, 10], fov: 36, near: 0.05, far: 80 }, gl: { antialias: view.quality === "high", alpha: true, powerPreference: "high-performance" }, onPointerMissed: () => {
      if (!moved.current) select(null);
    }, "aria-label": "3D knowledge brain. Equivalent entities are available in the accessible list.", children: [
      /* @__PURE__ */ jsx3(CameraRig, { layout, active, onReady, onFailure }),
      view.layout === "brain" && /* @__PURE__ */ jsx3(BrainEnvelope, { quality: view.quality, color: envelopeColor }),
      /* @__PURE__ */ jsx3(GraphEdges, { layout }),
      /* @__PURE__ */ jsx3(GraphNodes, { layout, moved, onHover: setHover }),
      /* @__PURE__ */ jsx3(LabelProjection, { labels, elements: labelsRef, layout, width, height }),
      renderExtra?.()
    ] }),
    /* @__PURE__ */ jsx3("div", { className: "brain-world-labels", "aria-hidden": "true", children: labels.map((node) => /* @__PURE__ */ jsxs3("span", { ref: (element) => {
      if (element) labelsRef.current.set(node.id, element);
      else labelsRef.current.delete(node.id);
    }, className: `brain-world-label ${node.id === selectedNodeId ? "is-selected" : ""} ${node.kind === "skill" ? "is-procedural" : ""}`, children: [
      node.label,
      node.loadedCount ? /* @__PURE__ */ jsx3("b", { children: node.loadedCount }) : null
    ] }, node.id)) }),
    hovered && !moved.current && /* @__PURE__ */ jsxs3("div", { className: "brain-hover-tooltip", role: "tooltip", children: [
      /* @__PURE__ */ jsx3("strong", { children: hovered.label }),
      /* @__PURE__ */ jsxs3("span", { children: [
        nodeStyle(hovered).label,
        " \xB7 ",
        hovered.version ?? "version unknown",
        hovered.loadedCount ? ` \xB7 ${hovered.loadedCount} loaded; total ${hovered.totalCount ?? "unknown"}` : ""
      ] })
    ] })
  ] });
}
export {
  BrainWebGLRenderer
};
