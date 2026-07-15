import { create } from "zustand";
import type { AlgoName, Link, NodeId, RouterNode } from "@/lib/graph/types";

export type Mode = "build" | "simulate" | "drag";
export type NodePhase = "idle" | "frontier" | "current" | "settled";

interface Stats {
  hops: number;
  cost: number;
  visitedCount: number;
  edgesRelaxed: number;
  opCount: number;
  ms: number;
}

interface State {
  nodes: RouterNode[];
  links: Link[];
  selectedNode: NodeId | null;
  selectedNodes: NodeId[];
  selectedLink: string | null;
  linkStart: NodeId | null;
  source: NodeId | null;
  destination: NodeId | null;
  algo: AlgoName;
  mode: Mode;
  speed: number;
  running: boolean;
  unweighted: boolean;
  phases: Record<NodeId, NodePhase>;
  currentNode: NodeId | null;
  path: NodeId[];
  routingTable: Record<NodeId, { nextHop: NodeId | null; cost: number; hops: number }>;
  stats: Stats;
  events: string[];
  packetProgress: number | null;
  linkFailure: boolean;
  activeLine: number | null;
  ranLines: number[];
  distances: Record<NodeId, number>;
  explanations: string[];
  paused: boolean;

  addNode: (x: number, y: number) => void;
  deleteNode: (id: NodeId) => void;
  deleteNodes: (ids: NodeId[]) => void;
  moveNode: (id: NodeId, x: number, y: number) => void;
  moveNodesBy: (ids: NodeId[], dx: number, dy: number, bounds: { w: number; h: number }) => void;
  startLink: (id: NodeId) => void;
  completeLink: (to: NodeId, weight: number) => void;
  cancelLink: () => void;
  deleteLink: (id: string) => void;
  setLinkWeight: (id: string, w: number) => void;
  toggleLinkFailed: (id: string) => void;
  setSelectedNode: (id: NodeId | null) => void;
  setSelectedNodes: (ids: NodeId[]) => void;
  toggleSelectedNode: (id: NodeId) => void;
  setSelectedLink: (id: string | null) => void;
  setSource: (id: NodeId | null) => void;
  setDestination: (id: NodeId | null) => void;
  setAlgo: (a: AlgoName) => void;
  setMode: (m: Mode) => void;
  setSpeed: (s: number) => void;
  setUnweighted: (u: boolean) => void;
  clearAll: () => void;
  clearAlgoState: () => void;
  loadTopology: (nodes: RouterNode[], links: Link[]) => void;

  setPhases: (p: Record<NodeId, NodePhase>) => void;
  setCurrentNode: (id: NodeId | null) => void;
  setPath: (path: NodeId[]) => void;
  setRoutingTable: (rt: State["routingTable"]) => void;
  setStats: (s: Stats) => void;
  logEvent: (msg: string) => void;
  setRunning: (r: boolean) => void;
  setPacketProgress: (p: number | null) => void;
  setActiveLine: (line: number | null) => void;
  setRanLines: (lines: number[]) => void;
  addRanLine: (line: number) => void;
  setDistances: (d: Record<NodeId, number>) => void;
  addExplanation: (msg: string) => void;
  setPaused: (p: boolean) => void;
}

let nodeCounter = 0;
let linkCounter = 0;
const emptyStats: Stats = { hops: 0, cost: 0, visitedCount: 0, edgesRelaxed: 0, opCount: 0, ms: 0 };

export const useSim = create<State>((set) => ({
  nodes: [],
  links: [],
  selectedNode: null,
  selectedNodes: [],
  selectedLink: null,
  linkStart: null,
  source: null,
  destination: null,
  algo: "dijkstra",
  mode: "build",
  speed: 1,
  running: false,
  unweighted: false,
  phases: {},
  currentNode: null,
  path: [],
  routingTable: {},
  stats: emptyStats,
  events: [],
  packetProgress: null,
  linkFailure: false,
  activeLine: null,
  ranLines: [],
  distances: {},
  explanations: [],
  paused: false,

  addNode: (x, y) => set(s => {
    const id = `R${nodeCounter++}`;
    return { nodes: [...s.nodes, { id, label: id, x, y }] };
  }),
  deleteNode: (id) => set(s => ({
    nodes: s.nodes.filter(n => n.id !== id),
    links: s.links.filter(l => l.from !== id && l.to !== id),
    source: s.source === id ? null : s.source,
    destination: s.destination === id ? null : s.destination,
    selectedNode: s.selectedNode === id ? null : s.selectedNode,
    selectedNodes: s.selectedNodes.filter(x => x !== id),
  })),
  deleteNodes: (ids) => set(s => {
    const idSet = new Set(ids);
    return {
      nodes: s.nodes.filter(n => !idSet.has(n.id)),
      links: s.links.filter(l => !idSet.has(l.from) && !idSet.has(l.to)),
      source: s.source && idSet.has(s.source) ? null : s.source,
      destination: s.destination && idSet.has(s.destination) ? null : s.destination,
      selectedNode: s.selectedNode && idSet.has(s.selectedNode) ? null : s.selectedNode,
      selectedNodes: [],
    };
  }),
  moveNode: (id, x, y) => set(s => ({
    nodes: s.nodes.map(n => n.id === id ? { ...n, x, y } : n),
  })),
  moveNodesBy: (ids, dx, dy, bounds) => set(s => {
    const idSet = new Set(ids);
    return {
      nodes: s.nodes.map(n => idSet.has(n.id)
        ? { ...n, x: Math.max(24, Math.min(bounds.w - 24, n.x + dx)), y: Math.max(24, Math.min(bounds.h - 24, n.y + dy)) }
        : n),
    };
  }),
  startLink: (id) => set({ linkStart: id }),
  completeLink: (to, weight) => set(s => {
    if (!s.linkStart || s.linkStart === to) return { linkStart: null };
    const exists = s.links.some(l =>
      (l.from === s.linkStart && l.to === to) || (l.from === to && l.to === s.linkStart)
    );
    if (exists) return { linkStart: null };
    const id = `L${linkCounter++}`;
    return {
      links: [...s.links, { id, from: s.linkStart, to, weight }],
      linkStart: null,
    };
  }),
  cancelLink: () => set({ linkStart: null }),
  deleteLink: (id) => set(s => ({
    links: s.links.filter(l => l.id !== id),
    selectedLink: s.selectedLink === id ? null : s.selectedLink,
  })),
  setLinkWeight: (id, w) => set(s => ({
    links: s.links.map(l => l.id === id ? { ...l, weight: w } : l),
  })),
  toggleLinkFailed: (id) => set(s => {
    const links = s.links.map(l => l.id === id ? { ...l, failed: !l.failed } : l);
    const anyFail = links.some(l => l.failed);
    return { links, linkFailure: anyFail };
  }),
  setSelectedNode: (id) => set({ selectedNode: id, selectedLink: null, selectedNodes: id ? [id] : [] }),
  setSelectedNodes: (ids) => set({ selectedNodes: ids, selectedNode: ids[ids.length - 1] ?? null, selectedLink: null }),
  toggleSelectedNode: (id) => set(s => {
    const has = s.selectedNodes.includes(id);
    const next = has ? s.selectedNodes.filter(x => x !== id) : [...s.selectedNodes, id];
    return { selectedNodes: next, selectedNode: next[next.length - 1] ?? null, selectedLink: null };
  }),
  setSelectedLink: (id) => set({ selectedLink: id, selectedNode: null, selectedNodes: [] }),
  setSource: (id) => set({ source: id }),
  setDestination: (id) => set({ destination: id }),
  setAlgo: (a) => set({ algo: a }),
  setMode: (m) => set({ mode: m }),
  setSpeed: (s) => set({ speed: s }),
  setUnweighted: (u) => set({ unweighted: u }),
  clearAll: () => { nodeCounter = 0; linkCounter = 0; set({
    nodes: [], links: [], selectedNode: null, selectedNodes: [], selectedLink: null, linkStart: null,
    source: null, destination: null, phases: {}, currentNode: null, path: [],
    routingTable: {}, stats: emptyStats, events: [], packetProgress: null, linkFailure: false,
    activeLine: null, ranLines: [], distances: {}, explanations: [], paused: false,
  }); },
  clearAlgoState: () => set({
    phases: {}, currentNode: null, path: [], routingTable: {}, stats: emptyStats,
    events: [], packetProgress: null, running: false, activeLine: null, ranLines: [], distances: {}, explanations: [], paused: false,
  }),
  loadTopology: (nodes, links) => {
    let maxN = -1, maxL = -1;
    for (const n of nodes) { const m = /^R(\d+)$/.exec(n.id); if (m) maxN = Math.max(maxN, parseInt(m[1])); }
    for (const l of links) { const m = /^L(\d+)$/.exec(l.id); if (m) maxL = Math.max(maxL, parseInt(m[1])); }
    nodeCounter = maxN + 1;
    linkCounter = maxL + 1;
    set({
      nodes, links,
      selectedNode: null, selectedNodes: [], selectedLink: null, linkStart: null,
      source: null, destination: null,
      phases: {}, currentNode: null, path: [], routingTable: {}, stats: emptyStats,
      events: [], packetProgress: null, linkFailure: links.some(l => l.failed),
      activeLine: null, ranLines: [], distances: {}, explanations: [], paused: false,
    });
  },

  setPhases: (p) => set({ phases: p }),
  setCurrentNode: (id) => set({ currentNode: id }),
  setPath: (path) => set({ path }),
  setRoutingTable: (rt) => set({ routingTable: rt }),
  setStats: (s) => set({ stats: s }),
  logEvent: (msg) => set(s => ({
    events: [...s.events.slice(-199), `[${new Date().toLocaleTimeString()}] ${msg}`],
  })),
  setRunning: (r) => set({ running: r }),
  setPacketProgress: (p) => set({ packetProgress: p }),
  setActiveLine: (line) => set({ activeLine: line }),
  setRanLines: (lines) => set({ ranLines: lines }),
  addRanLine: (line) => set(s => {
    if (s.ranLines.includes(line)) return {};
    return { ranLines: [...s.ranLines, line] };
  }),
  setDistances: (d) => set({ distances: d }),
  addExplanation: (msg) => set(s => ({ explanations: [...s.explanations, msg] })),
  setPaused: (p) => set({ paused: p }),
}));
