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
  
  // Line 0: for each vertex v: dist[v] ← ∞
  yield { type: "line", line: 0 };
  for (const n of nodes) { dist[n.id] = Infinity; prev[n.id] = null; }
  
  // Line 1: dist[source] ← 0
  yield { type: "line", line: 1 };
  dist[src] = 0;
  yield { type: "init", source: src, dist: { ...dist } };
  
  // Line 2: PQ ← {(0, source)}
  yield { type: "line", line: 2 };
  const pq = new MinPriorityQueue<NodeId>();
  pq.push(0, src);
  yield { type: "enqueue", node: src, dist: 0 };
  
  const settled = new Set<NodeId>();
  let ops = 0;
  
  // Line 3: while PQ not empty:
  yield { type: "line", line: 3 };
  while (!pq.isEmpty()) {
    // Line 4: u ← extractMin(PQ)
    yield { type: "line", line: 4 };
    const top = pq.pop()!;
    ops++;
    const u = top.value;
    if (settled.has(u)) continue;
    settled.add(u);
    yield { type: "visit", node: u, dist: dist[u] };
    
    // Line 5: for each edge (u, v, w):
    yield { type: "line", line: 5 };
    for (const { to: v, w } of adj[u] ?? []) {
      // Line 6: if dist[u] + w < dist[v]:
      yield { type: "line", line: 6 };
      const nd = dist[u] + w;
      if (nd < dist[v]) {
        const oldD = dist[v];
        dist[v] = nd;
        prev[v] = u;
        
        // Line 7: dist[v] ← dist[u] + w
        yield { type: "line", line: 7 };
        // Line 8: prev[v] ← u
        yield { type: "line", line: 8 };
        // Line 9: PQ.push(dist[v], v)
        yield { type: "line", line: 9 };
        pq.push(nd, v);
        ops++;
        yield { type: "relax", from: u, to: v, newDist: nd, oldDist: oldD };
        yield { type: "enqueue", node: v, dist: nd };
      }
    }
    yield { type: "settle", node: u, dist: dist[u] };
    yield { type: "line", line: 3 };
  }
  yield { type: "done", dist, prev, opCount: ops };
}

export function* bfs(nodes: RouterNode[], links: Link[], src: NodeId): Generator<AlgoEvent> {
  const adj = buildAdj(nodes, links);
  const dist: Record<NodeId, number> = {};
  const prev: Record<NodeId, NodeId | null> = {};
  
  // Line 0: for each vertex v: dist[v] ← ∞
  yield { type: "line", line: 0 };
  for (const n of nodes) { dist[n.id] = Infinity; prev[n.id] = null; }
  
  // Line 1: dist[source] ← 0
  yield { type: "line", line: 1 };
  dist[src] = 0;
  yield { type: "init", source: src, dist: { ...dist } };
  
  // Line 2: Q ← [source]
  yield { type: "line", line: 2 };
  const q: NodeId[] = [src];
  yield { type: "enqueue", node: src, dist: 0 };
  
  const seen = new Set<NodeId>([src]);
  let ops = 0;
  
  // Line 3: while Q not empty:
  yield { type: "line", line: 3 };
  while (q.length) {
    // Line 4: u ← Q.dequeue()
    yield { type: "line", line: 4 };
    const u = q.shift()!;
    ops++;
    yield { type: "visit", node: u, dist: dist[u] };
    
    // Line 5: for each neighbor v of u:
    yield { type: "line", line: 5 };
    for (const { to: v } of adj[u] ?? []) {
      // Line 6: if v not visited:
      yield { type: "line", line: 6 };
      if (!seen.has(v)) {
        seen.add(v);
        prev[v] = u;
        dist[v] = dist[u] + 1;
        
        // Line 7: dist[v] ← dist[u] + 1
        yield { type: "line", line: 7 };
        // Line 8: prev[v] ← u
        yield { type: "line", line: 8 };
        // Line 9: Q.enqueue(v)
        yield { type: "line", line: 9 };
        q.push(v);
        ops++;
        yield { type: "relax", from: u, to: v, newDist: dist[v], oldDist: Infinity };
        yield { type: "enqueue", node: v, dist: dist[v] };
      }
    }
    yield { type: "settle", node: u, dist: dist[u] };
    yield { type: "line", line: 3 };
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
  
  // Line 0: stack ← [source]
  yield { type: "line", line: 0 };
  const stack: NodeId[] = [src];
  const seen = new Set<NodeId>();
  let ops = 0;
  
  // Line 1: while stack not empty:
  yield { type: "line", line: 1 };
  while (stack.length) {
    // Line 2: u ← stack.pop()
    yield { type: "line", line: 2 };
    const u = stack.pop()!;
    
    // Line 3: if u visited: continue
    yield { type: "line", line: 3 };
    if (seen.has(u)) continue;
    
    // Line 4: mark u visited
    yield { type: "line", line: 4 };
    seen.add(u);
    ops++;
    yield { type: "visit", node: u, dist: dist[u] };
    
    // Line 5: for each neighbor v of u:
    yield { type: "line", line: 5 };
    for (const { to: v, w } of adj[u] ?? []) {
      // Line 6: if v not visited:
      yield { type: "line", line: 6 };
      if (!seen.has(v)) {
        if (prev[v] === null && v !== src) {
          prev[v] = u;
          dist[v] = dist[u] + w;
          yield { type: "relax", from: u, to: v, newDist: dist[v], oldDist: Infinity };
        }
        // Line 7: prev[v] ← u
        yield { type: "line", line: 7 };
        // Line 8: stack.push(v)
        yield { type: "line", line: 8 };
        stack.push(v);
        ops++;
        yield { type: "enqueue", node: v, dist: dist[v] };
      }
    }
    yield { type: "settle", node: u, dist: dist[u] };
    yield { type: "line", line: 1 };
  }
  yield { type: "done", dist, prev, opCount: ops };
}

export function* bellmanFord(nodes: RouterNode[], links: Link[], src: NodeId): Generator<AlgoEvent> {
  const dist: Record<NodeId, number> = {};
  const prev: Record<NodeId, NodeId | null> = {};
  
  // Line 0: for each vertex v: dist[v] ← ∞
  yield { type: "line", line: 0 };
  for (const n of nodes) { dist[n.id] = Infinity; prev[n.id] = null; }
  
  // Line 1: dist[source] ← 0
  yield { type: "line", line: 1 };
  dist[src] = 0;
  yield { type: "init", source: src, dist: { ...dist } };
  
  const edges = links.filter(e => !e.failed).flatMap(e => [
    { u: e.from, v: e.to, w: e.weight },
    { u: e.to, v: e.from, w: e.weight },
  ]);
  let ops = 0;
  
  // Line 2: repeat V-1 times:
  yield { type: "line", line: 2 };
  for (let i = 0; i < nodes.length - 1; i++) {
    let changed = false;
    // Line 3: for each edge (u, v, w):
    yield { type: "line", line: 3 };
    for (const { u, v, w } of edges) {
      ops++;
      // Line 4: if dist[u] + w < dist[v]:
      yield { type: "line", line: 4 };
      if (dist[u] + w < dist[v]) {
        const old = dist[v];
        dist[v] = dist[u] + w;
        prev[v] = u;
        changed = true;
        
        // Line 5: dist[v] ← dist[u] + w
        yield { type: "line", line: 5 };
        // Line 6: prev[v] ← u
        yield { type: "line", line: 6 };
        
        yield { type: "relax", from: u, to: v, newDist: dist[v], oldDist: old };
        yield { type: "visit", node: v, dist: dist[v] };
      }
    }
    if (!changed) break;
    yield { type: "line", line: 2 };
  }
  
  // Line 7: check for negative cycles
  yield { type: "line", line: 7 };
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
