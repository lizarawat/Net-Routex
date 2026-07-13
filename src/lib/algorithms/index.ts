import { MinPriorityQueue } from "../graph/PriorityQueue";
import type { AlgoEvent, AlgoName, Link, NodeId, RouterNode } from "../graph/types";

function buildAdj(nodes: RouterNode[], links: Link[]) {
  const adj: Record<NodeId, Array<{ to: NodeId; w: number }>> = {};
  for (const n of nodes) adj[n.id] = [];
  for (const e of links) {
    if (e.failed) continue;
    adj[e.from].push({ to: e.to, w: e.weight });
    adj[e.to].push({ to: e.from, w: e.weight }); // undirected
  }
  return adj;
}

function reconstruct(prev: Record<NodeId, NodeId | null>, src: NodeId, dst: NodeId): NodeId[] {
  const out: NodeId[] = [];
  let cur: NodeId | null = dst;
  while (cur) {
    out.push(cur);
    if (cur === src) break;
    cur = prev[cur] ?? null;
  }
  if (out[out.length - 1] !== src) return [];
  return out.reverse();
}

export function* dijkstra(nodes: RouterNode[], links: Link[], src: NodeId): Generator<AlgoEvent> {
  const adj = buildAdj(nodes, links);
  const dist: Record<NodeId, number> = {};
  const prev: Record<NodeId, NodeId | null> = {};
  for (const n of nodes) { dist[n.id] = Infinity; prev[n.id] = null; }
  dist[src] = 0;
  yield { type: "init", source: src, dist: { ...dist } };
  const pq = new MinPriorityQueue<NodeId>();
  pq.push(0, src);
  yield { type: "enqueue", node: src, dist: 0 };
  const settled = new Set<NodeId>();
  let ops = 0;
  while (!pq.isEmpty()) {
    const top = pq.pop()!;
    ops++;
    const u = top.value;
    if (settled.has(u)) continue;
    settled.add(u);
    yield { type: "visit", node: u, dist: dist[u] };
    for (const { to: v, w } of adj[u] ?? []) {
      const nd = dist[u] + w;
      if (nd < dist[v]) {
        const oldD = dist[v];
        dist[v] = nd;
        prev[v] = u;
        pq.push(nd, v);
        ops++;
        yield { type: "relax", from: u, to: v, newDist: nd, oldDist: oldD };
        yield { type: "enqueue", node: v, dist: nd };
      }
    }
    yield { type: "settle", node: u, dist: dist[u] };
  }
  yield { type: "done", dist, prev, opCount: ops };
}

export function* bfs(nodes: RouterNode[], links: Link[], src: NodeId): Generator<AlgoEvent> {
  const adj = buildAdj(nodes, links);
  const dist: Record<NodeId, number> = {};
  const prev: Record<NodeId, NodeId | null> = {};
  for (const n of nodes) { dist[n.id] = Infinity; prev[n.id] = null; }
  dist[src] = 0;
  yield { type: "init", source: src, dist: { ...dist } };
  const q: NodeId[] = [src];
  yield { type: "enqueue", node: src, dist: 0 };
  const seen = new Set<NodeId>([src]);
  let ops = 0;
  while (q.length) {
    const u = q.shift()!;
    ops++;
    yield { type: "visit", node: u, dist: dist[u] };
    for (const { to: v } of adj[u] ?? []) {
      if (!seen.has(v)) {
        seen.add(v);
        prev[v] = u;
        dist[v] = dist[u] + 1;
        q.push(v);
        ops++;
        yield { type: "relax", from: u, to: v, newDist: dist[v], oldDist: Infinity };
        yield { type: "enqueue", node: v, dist: dist[v] };
      }
    }
    yield { type: "settle", node: u, dist: dist[u] };
  }
  yield { type: "done", dist, prev, opCount: ops };
}

export function* dfs(nodes: RouterNode[], links: Link[], src: NodeId): Generator<AlgoEvent> {
  const adj = buildAdj(nodes, links);
  const dist: Record<NodeId, number> = {};
  const prev: Record<NodeId, NodeId | null> = {};
  for (const n of nodes) { dist[n.id] = Infinity; prev[n.id] = null; }
  dist[src] = 0;
  yield { type: "init", source: src, dist: { ...dist } };
  const stack: NodeId[] = [src];
  const seen = new Set<NodeId>();
  let ops = 0;
  while (stack.length) {
    const u = stack.pop()!;
    if (seen.has(u)) continue;
    seen.add(u);
    ops++;
    yield { type: "visit", node: u, dist: dist[u] };
    for (const { to: v, w } of adj[u] ?? []) {
      if (!seen.has(v)) {
        if (prev[v] === null && v !== src) {
          prev[v] = u;
          dist[v] = dist[u] + w;
          yield { type: "relax", from: u, to: v, newDist: dist[v], oldDist: Infinity };
        }
        stack.push(v);
        ops++;
        yield { type: "enqueue", node: v, dist: dist[v] };
      }
    }
    yield { type: "settle", node: u, dist: dist[u] };
  }
  yield { type: "done", dist, prev, opCount: ops };
}

export function* bellmanFord(nodes: RouterNode[], links: Link[], src: NodeId): Generator<AlgoEvent> {
  const dist: Record<NodeId, number> = {};
  const prev: Record<NodeId, NodeId | null> = {};
  for (const n of nodes) { dist[n.id] = Infinity; prev[n.id] = null; }
  dist[src] = 0;
  yield { type: "init", source: src, dist: { ...dist } };
  const edges = links.filter(e => !e.failed).flatMap(e => [
    { u: e.from, v: e.to, w: e.weight },
    { u: e.to, v: e.from, w: e.weight },
  ]);
  let ops = 0;
  for (let i = 0; i < nodes.length - 1; i++) {
    let changed = false;
    for (const { u, v, w } of edges) {
      ops++;
      if (dist[u] + w < dist[v]) {
        const old = dist[v];
        dist[v] = dist[u] + w;
        prev[v] = u;
        changed = true;
        yield { type: "relax", from: u, to: v, newDist: dist[v], oldDist: old };
        yield { type: "visit", node: v, dist: dist[v] };
      }
    }
    if (!changed) break;
  }
  for (const { u, v, w } of edges) {
    if (dist[u] + w < dist[v]) { yield { type: "negative-cycle" }; break; }
  }
  yield { type: "done", dist, prev, opCount: ops };
}

export function runAlgorithm(name: AlgoName, nodes: RouterNode[], links: Link[], src: NodeId) {
  switch (name) {
    case "dijkstra": return dijkstra(nodes, links, src);
    case "bfs": return bfs(nodes, links, src);
    case "dfs": return dfs(nodes, links, src);
    case "bellman-ford": return bellmanFord(nodes, links, src);
  }
}

export function reconstructPath(prev: Record<NodeId, NodeId | null>, src: NodeId, dst: NodeId): NodeId[] {
  return reconstruct(prev, src, dst);
}
