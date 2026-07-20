import { runAlgorithm, reconstructPath } from "@/lib/algorithms";
import type { AlgoEvent, NodeId } from "@/lib/graph/types";
import { useSim } from "@/state/simStore";

let cancelled = false;
export function cancelRun() { cancelled = true; }

function currentSpeed() { return useSim.getState().speed || 1; }
function stepDelay() { return Math.max(20, 380 / currentSpeed()); }

export async function runSimulation() {
  const s = useSim.getState();
  const { nodes, links, source, destination, algo, unweighted } = s;
  if (!source || !destination) {
    s.logEvent("! Select source and destination first");
    return;
  }
  cancelled = false;
  s.clearAlgoState();
  s.setRunning(true);
  s.setPaused(false);
  s.setFailed(false);
  s.logEvent(`> run ${algo.toUpperCase()} from ${source} to ${destination} (C++ backend)`);
  s.addLevMessage(
    `Starting ${algo} on C++ backend. Exploring from ${source} toward ${destination}${unweighted ? " (unweighted)." : "."}`,
  );
  if (links.some((link) => link.failed)) {
    s.addLevMessage(
      "Some links are marked failed, so the algorithm will ignore them and look for a backup route.",
    );
  }

  // Fetch pre-calculated algorithms and traces from C++ server
  let response;
  try {
    const activeLinks = unweighted ? links.map((link) => ({ ...link, weight: 1 })) : links;
    const res = await fetch("http://localhost:8000/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes, links: activeLinks, source, destination, algo }),
    });
    if (!res.ok) throw new Error("C++ server error: " + res.status);
    response = await res.json();
  } catch (e) {
    s.logEvent("! Connection to C++ Server failed. Make sure C++ backend is running on http://localhost:8000");
    s.addLevMessage("Could not connect to C++ backend. Please compile and start server.cpp first!");
    s.setRunning(false);
    return;
  }

  const { events, path, cost } = response;
  const phases: Record<NodeId, "idle" | "frontier" | "current" | "settled"> = {};
  const distances: Record<NodeId, number> = {};
  for (const n of nodes) {
    phases[n.id] = "idle";
    distances[n.id] = Infinity;
  }
  let relaxed = 0;
  let opCount = 0;
  let finalDist: Record<NodeId, number> = {};
  let finalPrev: Record<NodeId, NodeId | null> = {};

  const start = performance.now();

  for (const ev of events) {
    if (cancelled) { s.setRunning(false); s.setActiveLine(null); return; }
    while (useSim.getState().paused && !cancelled) {
      await new Promise(r => setTimeout(r, 50));
    }
    if (cancelled) { s.setRunning(false); s.setActiveLine(null); return; }
    let shouldDelay = false;
    switch (ev.type) {
      case "line":
        s.setActiveLine(ev.line);
        s.addRanLine(ev.line);
        shouldDelay = true;
        break;
      case "init":
        for (const [nid, val] of Object.entries(ev.dist)) {
          distances[nid] = val === null ? Infinity : (val as number);
        }
        s.setDistances({ ...distances });
        s.addExplanation(`I am starting the search at the Source router (${ev.source}). Its distance is set to 0, and all other routers are set to infinity because we haven't visited them yet!`);
        s.logEvent(`init: dist[${ev.source}]=0`);
        break;
      case "enqueue":
        if (phases[ev.node] !== "settled") phases[ev.node] = "frontier";
        s.setPhases({ ...phases });
        const dVal = ev.dist === null ? Infinity : ev.dist;
        s.addExplanation(`I added router ${ev.node} to the queue of nodes to inspect next. (Current estimated distance: ${dVal === Infinity ? "∞" : dVal})`);
        s.logEvent(`enqueue ${ev.node} (d=${dVal === Infinity ? "∞" : dVal})`);
        s.addLevMessage(`${ev.node} is now in the frontier with distance ${dVal === Infinity ? "∞" : dVal}.`);
        break;
      case "visit":
        s.setCurrentNode(ev.node);
        phases[ev.node] = "current";
        s.setPhases({ ...phases });
        const visitD = ev.dist === null ? Infinity : ev.dist;
        s.addExplanation(`I am visiting router ${ev.node} now. I will look at all the outgoing cables connected to it to see if we can find any shortcuts.`);
        s.addLevMessage(`Now visiting ${ev.node}. I am checking its connected links for better routes.`);
        break;
      case "relax":
        relaxed++;
        distances[ev.to] = ev.newDist;
        s.setDistances({ ...distances });
        const oldD = ev.oldDist === null ? Infinity : ev.oldDist;
        s.addExplanation(`Found a shortcut! Going through ${ev.from} to reach ${ev.to} is shorter. We update its distance from ${oldD === Infinity ? "∞" : oldD} to ${ev.newDist}.`);
        s.logEvent(`relax ${ev.from}→${ev.to}: ${oldD === Infinity ? "∞" : oldD} → ${ev.newDist}`);
        s.addLevMessage(
          oldD === Infinity
            ? `Found ${ev.to} through ${ev.from}. Its first known distance is ${ev.newDist}.`
            : `Found a shortcut to ${ev.to} through ${ev.from}: ${oldD} becomes ${ev.newDist}.`,
        );
        break;
      case "settle":
        phases[ev.node] = "settled";
        s.setPhases({ ...phases });
        s.setCurrentNode(null);
        s.addExplanation(`I have locked in the final shortest path to router ${ev.node}. This node is now settled, meaning we won't need to check it again.`);
        shouldDelay = true;
        break;
      case "negative-cycle":
        s.addExplanation(`Oh no! I detected a negative weight cycle. The path cost would keep dropping to negative infinity forever, so we must stop!`);
        s.setFailed(true);
        s.logEvent("! negative cycle detected");
        s.addLevMessage(
          "Bellman-Ford detected a negative cycle, so shortest paths are not well-defined for this graph.",
        );
        shouldDelay = true;
        break;
      case "done":
        for (const [nid, val] of Object.entries(ev.dist)) {
          finalDist[nid] = val === null ? Infinity : (val as number);
        }
        finalPrev = ev.prev;
        opCount = ev.opCount;
        break;
    }
    // Live speed: read current slider each tick.
    if (shouldDelay) {
      await new Promise(r => setTimeout(r, stepDelay()));
    }
  }

  const ms = performance.now() - start;
  const visitedCount = Object.values(phases).filter(p => p === "settled").length;

  if (path.length) {
    for (const id of path) phases[id] = "settled";
    s.setPhases({ ...phases });
    s.setFailed(false);
    s.addExplanation(`Success! I found the shortest path from ${source} to ${destination} with a total cost of ${cost}. The route is highlighted in cyan!`);
  } else {
    s.setFailed(true);
    s.addExplanation(`Search complete, but Router ${destination} is unreachable from Router ${source}. There is no path connecting them!`);
  }
  s.setPath(path);
  s.setActiveLine(null);

  const rt: Record<NodeId, { nextHop: NodeId | null; cost: number; hops: number }> = {};
  for (const n of nodes) {
    if (n.id === source) continue;
    const p = reconstructPath(finalPrev, source, n.id);
    if (!p.length) { rt[n.id] = { nextHop: null, cost: Infinity, hops: 0 }; continue; }
    rt[n.id] = {
      nextHop: p.length > 1 ? p[1] : null,
      cost: finalDist[n.id] ?? Infinity,
      hops: p.length - 1,
    };
  }
  s.setRoutingTable(rt);
  s.setStats({
    hops: Math.max(0, path.length - 1),
    cost: path.length ? cost : 0,
    visitedCount,
    edgesRelaxed: relaxed,
    opCount,
    ms: Math.round(ms * 100) / 100,
  });

  if (!path.length) {
    s.logEvent(`! ${destination} unreachable from ${source}`);
    s.addLevMessage(`${destination} is unreachable from ${source}. Try adding a link or repairing a failed link.`);
    s.setRunning(false);
    return;
  }
  s.logEvent(`✓ path found: ${path.join(" → ")} (cost ${cost}, ${path.length - 1} hops, ${Math.round(ms)}ms)`);
  s.addLevMessage(`Shortest path found: ${path.join(" -> ")}. Total cost is ${cost} across ${path.length - 1} hop(s).`);

  // Packet animation: rAF-driven, respects live speed changes.
  const totalSegments = path.length - 1;
  const msPerSegmentAtNormalSpeed = 550;
  await new Promise<void>((resolve) => {
    let progress = 0;
    let last = performance.now();
    function frame(now: number) {
      if (cancelled) {
        useSim.getState().setPacketProgress(null);
        useSim.getState().setRunning(false);
        resolve();
        return;
      }
      if (useSim.getState().paused) {
        last = now;
        requestAnimationFrame(frame);
        return;
      }
      const dt = now - last;
      last = now;
      const segPerMs = 1 / (msPerSegmentAtNormalSpeed / currentSpeed());
      progress += dt * segPerMs;
      if (progress >= totalSegments) {
        useSim.getState().setPacketProgress(totalSegments);
        useSim.getState().setRunning(false);
        resolve();
        return;
      }
      useSim.getState().setPacketProgress(progress);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
