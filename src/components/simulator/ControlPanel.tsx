import { useSim } from "@/state/simStore";
import { runSimulation, cancelRun } from "@/lib/simEngine";
import type { AlgoName } from "@/lib/graph/types";

const ALGOS: { value: AlgoName; label: string; complexity: string }[] = [
  { value: "dijkstra", label: "Dijkstra", complexity: "O((V+E) log V)" },
  { value: "bfs", label: "BFS (unweighted)", complexity: "O(V+E)" },
  { value: "dfs", label: "DFS", complexity: "O(V+E)" },
  { value: "bellman-ford", label: "Bellman-Ford", complexity: "O(V·E)" },
];

export function ControlPanel() {
  const {
    nodes, source, destination, algo, speed, running, linkFailure, unweighted,
    setSource, setDestination, setAlgo, setSpeed, setUnweighted, clearAll, clearAlgoState, loadTopology,
    logEvent,
  } = useSim();

  function randomTopology(weighted: boolean) {
    const n = 8;
    const nodes = Array.from({ length: n }, (_, i) => ({
      id: `R${i}`,
      label: `R${i}`,
      x: 120 + Math.random() * 660,
      y: 80 + Math.random() * 460,
    }));
    const links = [];
    for (let i = 0; i < n; i++) {
      const w = weighted ? 1 + Math.floor(Math.random() * 9) : 1;
      links.push({ id: `L${i}`, from: `R${i}`, to: `R${(i + 1) % n}`, weight: w });
    }
    let idc = n;
    for (let i = 0; i < n; i++) {
      for (let j = i + 2; j < n; j++) {
        if (Math.random() < 0.25) {
          const w = weighted ? 1 + Math.floor(Math.random() * 9) : 1;
          links.push({ id: `L${idc++}`, from: `R${i}`, to: `R${j}`, weight: w });
        }
      }
    }
    loadTopology(nodes, links);
    if (!weighted) setUnweighted(true);
    logEvent(`random ${weighted ? "weighted" : "unweighted"} topology: ${nodes.length} routers, ${links.length} links`);
  }

  function exportJson() {
    const { nodes, links } = useSim.getState();
    const data = JSON.stringify({ version: 1, nodes, links }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "netroutex-topology.json"; a.click();
    URL.revokeObjectURL(url);
    logEvent("exported topology");
  }

  function importJson() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "application/json";
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return;
      try {
        const txt = await f.text();
        const data = JSON.parse(txt);
        if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) throw new Error("bad shape");
        loadTopology(data.nodes, data.links);
        logEvent(`imported topology (${data.nodes.length} routers)`);
      } catch (e) {
        logEvent(`! import failed: ${(e as Error).message}`);
      }
    };
    input.click();
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <Section title="Endpoints">
        <label className="font-mono text-[10px] uppercase text-muted-foreground">Source</label>
        <NodeSelect value={source} onChange={setSource} placeholder="— pick —" />
        <label className="mt-2 font-mono text-[10px] uppercase text-muted-foreground">Destination</label>
        <NodeSelect value={destination} onChange={setDestination} placeholder="— pick —" />
      </Section>

      <Section title="Algorithm">
        <select
          value={algo}
          onChange={e => setAlgo(e.target.value as AlgoName)}
          className="w-full rounded border border-border bg-[var(--panel-2)] px-2 py-1.5 font-mono text-xs text-foreground focus:border-accent focus:outline-none"
        >
          {ALGOS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
          complexity: <span className="text-accent">{ALGOS.find(a => a.value === algo)?.complexity}</span>
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2 rounded border border-border bg-[var(--panel-2)] px-2 py-1.5 font-mono text-[11px]">
          <input
            type="checkbox"
            checked={unweighted}
            onChange={e => setUnweighted(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          <span>Unweighted graph</span>
          <span className="ml-auto text-[9px] uppercase text-muted-foreground">BFS ideal</span>
        </label>

        <label className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase text-muted-foreground">
          Speed <span className="text-accent">{speed.toFixed(2)}×</span>
        </label>
        <input
          type="range" min={0.25} max={4} step={0.05}
          value={speed} onChange={e => setSpeed(parseFloat(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
        <div className="mt-1 font-mono text-[9px] text-muted-foreground">Adjust anytime — takes effect immediately.</div>
      </Section>

      <Section title="Actions">
        <div className="grid grid-cols-2 gap-2">
          <Btn primary onClick={() => runSimulation()} disabled={running || !source || !destination}>
            {running ? "Running…" : "▶ Run"}
          </Btn>
          <Btn onClick={() => { cancelRun(); clearAlgoState(); logEvent("stopped"); }}>
            ■ Stop
          </Btn>
          <Btn onClick={() => { clearAlgoState(); logEvent("cleared run state"); }}>
            ↺ Reset run
          </Btn>
          <Btn onClick={() => randomTopology(true)}>⚄ Random</Btn>
          <Btn onClick={() => randomTopology(false)}>⚂ Random (unweighted)</Btn>
          <Btn onClick={importJson}>▼ Import</Btn>
          <Btn onClick={exportJson}>▲ Export</Btn>
          <Btn danger onClick={() => { if (window.confirm("Clear entire topology?")) { clearAll(); logEvent("topology cleared"); } }}>
            ✕ Clear all
          </Btn>
        </div>
        {linkFailure && (
          <div className="mt-2 rounded border border-accent-2 bg-[var(--panel-2)] px-2 py-1 font-mono text-[10px] text-accent-2">
            Link failure active — re-run to see reroute.
          </div>
        )}
      </Section>

      <Section title="Tips">
        <ul className="space-y-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
          <li>• Click canvas to place a router.</li>
          <li>• Double-click a router, then click another to link them.</li>
          <li>• Ctrl/⌘+click to multi-select · drag empty space to marquee-select.</li>
          <li>• Right-click a router or link for its menu · Delete key removes selection.</li>
          <li>• Scroll to zoom the canvas.</li>
        </ul>
      </Section>

      <div className="rounded border border-border bg-[var(--panel-2)] p-2 font-mono text-[10px] text-muted-foreground">
        <div className="mb-1 text-accent">Shortcuts</div>
        <div className="flex flex-wrap gap-1">
          <Kbd>Enter</Kbd> run
          <Kbd>Space</Kbd> stop
          <Kbd>R</Kbd> reset
          <Kbd>Del</Kbd> remove
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-[var(--panel)]">
      <div className="border-b border-border px-3 py-1.5 font-display text-[11px] uppercase tracking-widest text-accent">
        {title}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function NodeSelect({ value, onChange, placeholder }: { value: string | null; onChange: (v: string | null) => void; placeholder: string }) {
  const nodes = useSim(s => s.nodes);
  return (
    <select
      value={value ?? ""}
      onChange={e => onChange(e.target.value || null)}
      className="w-full rounded border border-border bg-[var(--panel-2)] px-2 py-1.5 font-mono text-xs text-foreground focus:border-accent focus:outline-none"
    >
      <option value="">{placeholder}</option>
      {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
    </select>
  );
}

function Btn({ children, onClick, disabled, primary, danger }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; primary?: boolean; danger?: boolean }) {
  const base = "rounded px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40";
  const cls = primary
    ? "bg-accent text-black font-bold hover:brightness-110"
    : danger
    ? "border border-accent-2 text-accent-2 hover:bg-accent-2 hover:text-black"
    : "border border-border bg-[var(--panel-2)] text-foreground hover:border-accent hover:text-accent";
  return <button onClick={onClick} disabled={disabled} className={`${base} ${cls}`}>{children}</button>;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <span className="rounded border border-border bg-[var(--panel)] px-1.5 py-0.5 text-[9px] text-foreground">{children}</span>;
}
