export type NodeId = string;

export interface RouterNode {
  id: NodeId;
  label: string;
  x: number;
  y: number;
}

export interface Link {
  id: string;
  from: NodeId;
  to: NodeId;
  weight: number;
  failed?: boolean;
}

export type AlgoName = "dijkstra" | "bfs" | "dfs" | "bellman-ford";

export type AlgoEvent =
  | { type: "init"; source: NodeId; dist: Record<NodeId, number> }
  | { type: "enqueue"; node: NodeId; dist: number }
  | { type: "visit"; node: NodeId; dist: number }
  | { type: "relax"; from: NodeId; to: NodeId; newDist: number; oldDist: number }
  | { type: "settle"; node: NodeId; dist: number }
  | { type: "done"; dist: Record<NodeId, number>; prev: Record<NodeId, NodeId | null>; opCount: number }
  | { type: "negative-cycle" };

export interface AlgoResult {
  path: NodeId[];
  cost: number;
  dist: Record<NodeId, number>;
  prev: Record<NodeId, NodeId | null>;
  visited: NodeId[];
  opCount: number;
  ms: number;
}
