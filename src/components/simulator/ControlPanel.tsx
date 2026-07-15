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
    const layoutType = Math.floor(Math.random() * 3); // 0, 1, 2
    let nodes: Array<{ id: string; label: string; x: number; y: number }> = [];
    let links: Array<{ id: string; from: string; to: string; weight: number }> = [];
    let linkIdCounter = 0;

    function getWeight() {
      return weighted ? 1 + Math.floor(Math.random() * 9) : 1;
    }

    if (layoutType === 0) {
      // 1. Circular Mesh (Ring with chords)
      const n = 8;
      const centerX = 450;
      const centerY = 310;
      const rx = 320;
      const ry = 220;

      nodes = Array.from({ length: n }, (_, i) => {
        const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
        return {
          id: `R${i}`,
          label: `R${i}`,
          x: Math.round(centerX + rx * Math.cos(angle)),
          y: Math.round(centerY + ry * Math.sin(angle)),
        };
      });

      // Ring connections
      for (let i = 0; i < n; i++) {
        links.push({
          id: `L${linkIdCounter++}`,
          from: `R${i}`,
          to: `R${(i + 1) % n}`,
          weight: getWeight(),
        });
      }

      // Chordal connections
      for (let i = 0; i < n; i++) {
        for (let j = i + 2; j < n; j++) {
          if (i === 0 && j === n - 1) continue; // skip wrap-around adjacent
          if (Math.random() < 0.3) {
            links.push({
              id: `L${linkIdCounter++}`,
              from: `R${i}`,
              to: `R${j}`,
              weight: getWeight(),
            });
          }
        }
      }
    } else if (layoutType === 1) {
      // 2. Double-Row Grid Mesh (2x4)
      const cols = 4;
      const colWidth = 190;
      const startX = 180;
      const rowY1 = 180;
      const rowY2 = 440;

      // Row 1 (0 to 3) and Row 2 (4 to 7)
      for (let i = 0; i < 8; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        nodes.push({
          id: `R${i}`,
          label: `R${i}`,
          x: startX + col * colWidth,
          y: row === 0 ? rowY1 : rowY2,
        });
      }

      // Horizontal links
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const u = r * cols + c;
          const v = u + 1;
          links.push({
            id: `L${linkIdCounter++}`,
            from: `R${u}`,
            to: `R${v}`,
            weight: getWeight(),
          });
        }
      }

      // Vertical links
      for (let c = 0; c < cols; c++) {
        links.push({
          id: `L${linkIdCounter++}`,
          from: `R${c}`,
          to: `R${c + cols}`,
          weight: getWeight(),
        });
      }

      // Optional Diagonal links
      for (let c = 0; c < cols - 1; c++) {
        if (Math.random() < 0.25) {
          links.push({
            id: `L${linkIdCounter++}`,
            from: `R${c}`,
            to: `R${c + cols + 1}`,
            weight: getWeight(),
          });
        }
        if (Math.random() < 0.25) {
          links.push({
            id: `L${linkIdCounter++}`,
            from: `R${c + 1}`,
            to: `R${c + cols}`,
            weight: getWeight(),
          });
        }
      }
    } else {
      // 3. Star-Ring (Hub and Spoke)
      const nSpokes = 7;
      const centerX = 450;
      const centerY = 310;
      const rx = 290;
      const ry = 210;

      // Hub node in center
      nodes.push({ id: "R0", label: "R0", x: centerX, y: centerY });

      // Spoke nodes in circle
      for (let i = 1; i <= nSpokes; i++) {
        const angle = ((i - 1) * 2 * Math.PI) / nSpokes - Math.PI / 2;
        nodes.push({
          id: `R${i}`,
          label: `R${i}`,
          x: Math.round(centerX + rx * Math.cos(angle)),
          y: Math.round(centerY + ry * Math.sin(angle)),
        });
      }

      // Spoke connections
      for (let i = 1; i <= nSpokes; i++) {
        links.push({
          id: `L${linkIdCounter++}`,
          from: "R0",
          to: `R${i}`,
          weight: getWeight(),
        });
      }

      // Perimeter connections
      for (let i = 1; i <= nSpokes; i++) {
        const next = i === nSpokes ? 1 : i + 1;
        if (Math.random() < 0.5) {
          links.push({
            id: `L${linkIdCounter++}`,
            from: `R${i}`,
            to: `R${next}`,
            weight: getWeight(),
          });
        }
      }
    }

    loadTopology(nodes, links);
    if (!weighted) setUnweighted(true);
    
    let layoutName = "circular";
    if (layoutType === 1) layoutName = "grid";
    if (layoutType === 2) layoutName = "star-ring";
    
    logEvent(`random ${weighted ? "weighted" : "unweighted"} ${layoutName} topology: ${nodes.length} routers, ${links.length} links`);
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
