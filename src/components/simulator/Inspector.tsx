import { useSim } from "@/state/simStore";
import { useEffect, useRef, useState } from "react";

type Tab = "table" | "stats" | "code" | "log";

const PSEUDO: Record<string, string[]> = {
  dijkstra: [
    "for each vertex v: dist[v] ← ∞",
    "dist[source] ← 0",
    "PQ ← {(0, source)}",
    "while PQ not empty:",
    "  u ← extractMin(PQ)",
    "  for each edge (u, v, w):",
    "    if dist[u] + w < dist[v]:",
    "      dist[v] ← dist[u] + w",
    "      prev[v] ← u",
    "      PQ.push(dist[v], v)",
  ],
  bfs: [
    "for each vertex v: dist[v] ← ∞",
    "dist[source] ← 0",
    "Q ← [source]",
    "while Q not empty:",
    "  u ← Q.dequeue()",
    "  for each neighbor v of u:",
    "    if v not visited:",
    "      dist[v] ← dist[u] + 1",
    "      prev[v] ← u",
    "      Q.enqueue(v)",
  ],
  dfs: [
    "stack ← [source]",
    "while stack not empty:",
    "  u ← stack.pop()",
    "  if u visited: continue",
    "  mark u visited",
    "  for each neighbor v of u:",
    "    if v not visited:",
    "      prev[v] ← u",
    "      stack.push(v)",
  ],
  "bellman-ford": [
    "for each vertex v: dist[v] ← ∞",
    "dist[source] ← 0",
    "repeat V-1 times:",
    "  for each edge (u, v, w):",
    "    if dist[u] + w < dist[v]:",
    "      dist[v] ← dist[u] + w",
    "      prev[v] ← u",
    "check for negative cycles",
  ],
};

export function Inspector() {
  const [tab, setTab] = useState<Tab>("table");
  const source = useSim(s => s.source);
  const routingTable = useSim(s => s.routingTable);
  const stats = useSim(s => s.stats);
  const algo = useSim(s => s.algo);
  const events = useSim(s => s.events);
  const path = useSim(s => s.path);
  const currentNode = useSim(s => s.currentNode);
  const activeLine = useSim(s => s.activeLine);
  const ranLines = useSim(s => s.ranLines);

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-border">
        {(["table", "stats", "code", "log"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 border-r border-border px-2 py-2 font-mono text-[10px] uppercase tracking-widest transition ${
              tab === t ? "bg-accent text-black" : "text-muted-foreground hover:text-accent"
            }`}
          >
            {t === "table" ? "Routing" : t === "code" ? "Pseudocode" : t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === "table" && (
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase text-muted-foreground">
              Routing table from <span className="text-accent">{source ?? "—"}</span>
            </div>
            {Object.keys(routingTable).length === 0 ? (
              <div className="font-mono text-xs text-muted-foreground">No run yet.</div>
            ) : (
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase text-muted-foreground">
                    <th className="py-1">Dest</th>
                    <th>Next</th>
                    <th>Cost</th>
                    <th>Hops</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(routingTable).map(([dst, r]) => (
                    <tr key={dst} className="border-b border-border/60">
                      <td className="py-1 text-accent">{dst}</td>
                      <td>{r.nextHop ?? "—"}</td>
                      <td>{r.cost === Infinity ? "∞" : r.cost}</td>
                      <td>{r.hops || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {path.length > 0 && (
              <div className="mt-3 rounded-sm border border-accent bg-[var(--panel-2)] p-2 font-mono text-[11px]">
                <div className="text-[10px] uppercase text-muted-foreground">shortest path</div>
                <div className="text-accent">{path.join(" → ")}</div>
              </div>
            )}
          </div>
        )}

        {tab === "stats" && (
          <div className="space-y-2 font-mono text-xs">
            <StatRow k="Hops" v={stats.hops} />
            <StatRow k="Total cost" v={stats.cost} />
            <StatRow k="Nodes settled" v={stats.visitedCount} />
            <StatRow k="Edges relaxed" v={stats.edgesRelaxed} />
            <StatRow k="Operations" v={stats.opCount} />
            <StatRow k="Wall time (ms)" v={stats.ms} accent />
          </div>
        )}

        {tab === "code" && (
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase text-muted-foreground">
              {algo}
            </div>
            <pre className="font-mono text-[11px] leading-relaxed select-none">
              {PSEUDO[algo].map((line, i) => {
                const isActive = activeLine === i;
                const isRan = ranLines.includes(i);
                return (
                  <div
                    key={i}
                    className={`flex items-center py-0.5 px-2 transition-all duration-150 rounded-sm ${
                      isActive
                        ? "bg-[rgba(77,214,255,0.12)] text-accent border-l-2 border-accent font-bold shadow-[0_0_8px_rgba(77,214,255,0.15)] glow-cyan"
                        : isRan
                        ? "text-[var(--accent-3)] border-l-2 border-transparent opacity-95"
                        : "text-muted-foreground border-l-2 border-transparent opacity-50"
                    }`}
                  >
                    <span className="mr-3 text-[10px] font-normal text-muted-foreground/60 w-4 text-right">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono">{line}</span>
                  </div>
                );
              })}
            </pre>
          </div>
        )}

        {tab === "log" && <EventLog events={events} />}
      </div>
    </div>
  );
}

function StatRow({ k, v, accent }: { k: string; v: number; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/50 py-1">
      <span className="text-[10px] uppercase text-muted-foreground">{k}</span>
      <span className={accent ? "text-lg text-accent" : "text-sm"}>{v}</span>
    </div>
  );
}

function EventLog({ events }: { events: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [events]);

  function getRawLogs() {
    return events.map(e => `> ${e}`).join("\n");
  }

  function handleCopy() {
    navigator.clipboard.writeText(getRawLogs());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([getRawLogs()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `netroutex-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex justify-end gap-2 shrink-0">
        <button
          onClick={handleCopy}
          disabled={events.length === 0}
          className="rounded border border-border bg-[var(--panel-2)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground transition hover:border-accent hover:text-accent disabled:opacity-50 disabled:hover:border-border disabled:hover:text-muted-foreground cursor-pointer"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={handleDownload}
          disabled={events.length === 0}
          className="rounded border border-border bg-[var(--panel-2)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground transition hover:border-accent hover:text-accent disabled:opacity-50 disabled:hover:border-border disabled:hover:text-muted-foreground cursor-pointer"
        >
          Download (.txt)
        </button>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto rounded-sm border border-border bg-black/40 p-2 font-mono text-[11px] text-accent-3">
        {events.length === 0 && <div className="text-muted-foreground">Waiting for events…</div>}
        {events.map((e, i) => (
          <div key={i} className="whitespace-pre-wrap">&gt; {e}</div>
        ))}
      </div>
    </div>
  );
}
