import { createFileRoute, Link } from "@tanstack/react-router";
import { NetworkCanvas } from "@/components/simulator/NetworkCanvas";
import { ControlPanel } from "@/components/simulator/ControlPanel";
import { Inspector } from "@/components/simulator/Inspector";
import { useSim } from "@/state/simStore";
import { useEffect } from "react";
import { runSimulation, cancelRun } from "@/lib/simEngine";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Simulator — NetRouteX" },
      { name: "description", content: "Interactive network routing simulator with Dijkstra, BFS, DFS and Bellman-Ford visualizations." },
      { property: "og:title", content: "NetRouteX Simulator" },
      { property: "og:description", content: "Build a network and watch shortest-path algorithms execute step by step." },
    ],
  }),
  component: SimulatorPage,
});

const MODES = [
  { id: "build", label: "Build" },
  { id: "drag", label: "Drag" },
  { id: "simulate", label: "Simulate" },
] as const;

function SimulatorPage() {
  const mode = useSim(s => s.mode);
  const setMode = useSim(s => s.setMode);
  const running = useSim(s => s.running);
  const linkFailure = useSim(s => s.linkFailure);
  const source = useSim(s => s.source);
  const destination = useSim(s => s.destination);
  const nodes = useSim(s => s.nodes);
  const links = useSim(s => s.links);
  const algo = useSim(s => s.algo);
  const activeExplanation = useSim(s => s.activeExplanation);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t?.tagName === "INPUT" || t?.tagName === "SELECT" || t?.tagName === "TEXTAREA") return;
      if (e.key === "Enter") { e.preventDefault(); if (!running) runSimulation(); }
      else if (e.key === " ") { e.preventDefault(); cancelRun(); }
      else if (e.key.toLowerCase() === "r") { useSim.getState().clearAlgoState(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running]);

  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col gap-3 p-3">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border pb-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/" className="shrink-0 font-display text-lg font-black tracking-[0.2em] text-accent glow-cyan">
            NetRouteX
          </Link>
          <div className="truncate font-body text-sm text-muted-foreground">
            Routing Simulator
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill
            state={linkFailure ? "danger" : source && destination ? "safe" : "idle"}
            label={linkFailure ? "Link down" : source && destination ? "Ready" : "Idle"}
          />
          <div className="flex overflow-hidden rounded-md border border-border">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition ${
                  mode === m.id ? "bg-accent text-black" : "text-muted-foreground hover:text-accent"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="grid flex-1 gap-3 lg:grid-cols-[340px_1fr_340px]">
        <aside className="rounded-md border border-border bg-[var(--panel)]">
          <PanelHead>Controls</PanelHead>
          <ControlPanel />
        </aside>

        <section className="min-h-[520px] rounded-md border border-border bg-[var(--panel)]">
          <PanelHead>Network canvas</PanelHead>
          <div className="h-[calc(100%-32px)] min-h-[520px] p-2">
            <NetworkCanvas />
          </div>
        </section>

        <aside className="flex flex-col gap-3 h-full min-h-0">
          {/* Tips Section */}
          <div className="rounded-md border border-border bg-[var(--panel)] shrink-0">
            <PanelHead>Tips</PanelHead>
            <div className="p-3">
              <ul className="space-y-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
                <li>• Click canvas to place a router.</li>
                <li>• Double-click a router, then click another to link them.</li>
                <li>• Ctrl/⌘+click to multi-select · drag empty space to marquee-select.</li>
                <li>• Right-click a router or link for its menu · Delete key removes selection.</li>
                <li>• Scroll to zoom the canvas.</li>
              </ul>
            </div>
          </div>

          {/* Lev AI Helper Section */}
          <div className="rounded-md border border-border bg-[var(--panel)] shrink-0">
            <PanelHead>Lev (AI Helper)</PanelHead>
            <div className="flex gap-3 p-3 items-start">
              <img
                src="/lev-robot.jpg"
                alt="Lev the Robot"
                className="h-12 w-12 shrink-0 rounded-full border border-accent object-cover shadow-[0_0_8px_rgba(77,214,255,0.4)]"
              />
              <div className="flex-1 font-body text-[11px] leading-relaxed text-foreground bg-[var(--panel-2)] border border-border rounded p-2.5 min-h-[50px] relative">
                {/* Speech bubble pointer */}
                <div className="absolute left-[-5px] top-4 h-2 w-2 rotate-45 border-b border-l border-border bg-[var(--panel-2)]" />
                <p className="relative z-10 font-mono text-[10px]">
                  {activeExplanation ?? "Hi, I'm Lev! Choose a Source and Destination router, select an algorithm, and click RUN. I'll explain what's happening step-by-step!"}
                </p>
              </div>
            </div>
          </div>

          {/* Inspector Section */}
          <div className="flex-1 min-h-0 rounded-md border border-border bg-[var(--panel)]">
            <PanelHead>Inspector</PanelHead>
            <div className="h-[calc(100%-32px)]">
              <Inspector />
            </div>
          </div>
        </aside>
      </main>

      <footer className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-[var(--panel)] px-3 py-2 font-mono text-[10px] text-muted-foreground">
        <span>Algorithm: <span className="text-accent">{algo}</span></span>
        <span>Routers: <span className="text-foreground">{nodes.length}</span></span>
        <span>Links: <span className="text-foreground">{links.length}</span></span>
        <span className="ml-auto text-[10px] text-muted-foreground">Full docs in the Inspector's Pseudocode tab.</span>
      </footer>
    </div>
  );
}

function PanelHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-8 items-center border-b border-border px-3 font-display text-[11px] uppercase tracking-widest text-accent">
      {children}
    </div>
  );
}

function StatusPill({ state, label }: { state: "safe" | "danger" | "idle"; label: string }) {
  const color =
    state === "danger" ? "text-accent-2 border-accent-2" :
    state === "safe" ? "text-accent-3 border-accent-3" :
    "text-muted-foreground border-border";
  return (
    <div className={`flex items-center gap-2 rounded-md border px-3 py-1 font-mono text-[10px] tracking-widest ${color} ${state === "danger" ? "soft-pulse" : ""}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" style={{ boxShadow: "0 0 6px currentColor" }} />
      {label}
    </div>
  );
}
