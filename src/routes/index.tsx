import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Landing,
});

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8 7l8 0M7 8l4 8M17 8l-4 8"/></svg>
    ),
    title: "Graph editor",
    body: "Click empty space to drop routers, double-click one to draw a weighted link, drag to rearrange. Marquee-select or Ctrl/⌘-click for multi-select, then move whole clusters together.",
    learn: "Graph ADT · adjacency lists · edge weights",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h16M4 12h10M4 18h16"/><circle cx="18" cy="12" r="2"/></svg>
    ),
    title: "Four classic algorithms",
    body: "Run Dijkstra, BFS, DFS, or Bellman-Ford on the same graph. Each step yields a typed event — enqueue, visit, relax, settle — so you literally see the priority queue and visited set evolve.",
    learn: "Greedy · DP · min-heap · queue · stack",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="8"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4"/></svg>
    ),
    title: "Live visualization",
    body: "Nodes glow through idle → frontier → visiting → settled as the algorithm progresses. A packet animates along the final shortest path with speed you can dial 0.25× to 4× mid-run.",
    learn: "State machines · algorithm animation",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 10h18M10 5v14"/></svg>
    ),
    title: "Routing tables",
    body: "The Inspector auto-generates a next-hop table from the source: destination, next hop, total cost, hop count. Exactly what a real router computes after running SPF.",
    learn: "Predecessor arrays · path reconstruction",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 12h6l2-4 2 8 2-4h4"/></svg>
    ),
    title: "Link failure & rerouting",
    body: "Right-click any link to toggle failure. The failed edge dashes red; re-run the algorithm and watch the packet take a different route — the same reactive behaviour OSPF or IS-IS exhibits after a link event.",
    learn: "Dynamic graphs · reactive routing",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>
    ),
    title: "Import, export, unweighted mode",
    body: "Save any topology as JSON, reload it later, or share a demo. Flip the unweighted switch to treat every edge as cost 1 — the natural setting to compare BFS against Dijkstra.",
    learn: "Serialization · empirical complexity",
  },
];

function Landing() {
  return (
    <div className="relative z-10 min-h-screen">
      <header className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-6 sm:flex sm:justify-between">
        <div className="min-w-0">
          <div className="truncate font-display text-lg font-black tracking-[0.2em] text-accent glow-cyan">NetRouteX</div>
          <div className="mt-1 truncate font-body text-xs text-muted-foreground">A Data Structures & Algorithms project</div>
        </div>
        <Link to="/simulator" className="shrink-0 rounded-md bg-accent px-4 py-2 font-mono text-xs uppercase tracking-widest text-black hover:brightness-110">
          Launch simulator →
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
        <div className="rounded-lg border border-border bg-[var(--panel)] p-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">Data Structures & Algorithms</div>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
            <span className="glow-cyan text-accent">Build a network.</span><br />
            Watch algorithms find the shortest path.
          </h1>
          <p className="mt-6 max-w-2xl font-body text-lg text-muted-foreground">
            An interactive teaching simulator for graph algorithms. Place routers, connect them with
            weighted links, then run <span className="text-accent">Dijkstra</span>, <span className="text-accent">BFS</span>,{" "}
            <span className="text-accent">DFS</span>, or <span className="text-accent">Bellman-Ford</span> and see the priority queue,
            visited set, and packet come alive.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/simulator" className="rounded-md bg-accent px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest text-black hover:brightness-110">
              ▶ Launch simulator
            </Link>
            <a href="#features" className="rounded-md border border-border bg-[var(--panel-2)] px-6 py-3 font-mono text-sm uppercase tracking-widest hover:border-accent hover:text-accent">
              Learn more
            </a>
          </div>
        </div>

        <section id="features" className="mt-12">
          <h2 className="font-display text-2xl tracking-widest text-foreground">What you can do</h2>
          <p className="mt-1 max-w-2xl font-body text-sm text-muted-foreground">
            Every feature maps to a concrete DSA concept — the simulator is the lab, the graph is the whiteboard.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(f => (
              <article
                key={f.title}
                className="group flex flex-col rounded-lg border border-border bg-[var(--panel)] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-accent"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-[var(--panel-2)] text-accent">
                  {f.icon}
                </div>
                <h3 className="mt-4 font-display text-sm tracking-widest text-foreground group-hover:text-accent">
                  {f.title.toUpperCase()}
                </h3>
                <p className="mt-2 flex-1 font-body text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
                <div className="mt-4 border-t border-border pt-3 font-mono text-[10px] uppercase tracking-widest text-accent-3">
                  You'll learn: <span className="text-muted-foreground normal-case tracking-normal">{f.learn}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
