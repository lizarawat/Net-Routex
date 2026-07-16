import { useSim } from "@/state/simStore";
import type { RouterNode, Link, NodeId } from "@/lib/graph/types";
import { useEffect, useMemo, useRef, useState } from "react";

interface Props { width?: number; height?: number }

type Dialog =
  | { kind: "weight"; x: number; y: number; value: string; onConfirm: (n: number) => void }
  | { kind: "linkMenu"; x: number; y: number; linkId: string }
  | { kind: "nodeMenu"; x: number; y: number; nodeId: NodeId };

export function NetworkCanvas({ width: initialWidth = 900, height: initialHeight = 620 }: Props) {
  const [dims, setDims] = useState({ w: initialWidth, h: initialHeight });
  const width = dims.w;
  const height = dims.h;

  useEffect(() => {
    if (!wrapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          setDims({ w, h });
        }
      }
    });
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, []);
  const nodes = useSim(s => s.nodes);
  const links = useSim(s => s.links);
  const distances = useSim(s => s.distances);
  const phases = useSim(s => s.phases);
  const path = useSim(s => s.path);
  const packetProgress = useSim(s => s.packetProgress);
  const linkStart = useSim(s => s.linkStart);
  const source = useSim(s => s.source);
  const destination = useSim(s => s.destination);
  const selectedNodes = useSim(s => s.selectedNodes);
  const selectedLink = useSim(s => s.selectedLink);
  const mode = useSim(s => s.mode);
  const running = useSim(s => s.running);
  const unweighted = useSim(s => s.unweighted);

  const {
    addNode, deleteNode, moveNode, moveNodesBy, startLink, completeLink, cancelLink,
    deleteLink, setLinkWeight, toggleLinkFailed,
    setSelectedNode, toggleSelectedNode, setSelectedNodes, setSelectedLink,
  } = useSim.getState();

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<NodeId | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const dragMoved = useRef(false);
  const dragGroupPrev = useRef<{ x: number; y: number } | null>(null);

  // Zoom + pan
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const [panning, setPanning] = useState<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  const pathSet = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      s.add(a < b ? `${a}|${b}` : `${b}|${a}`);
    }
    return s;
  }, [path]);

  function toSVG(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: svgP.x, y: svgP.y };
  }

  function toWorld(clientX: number, clientY: number) {
    const svgP = toSVG(clientX, clientY);
    return { x: (svgP.x - view.tx) / view.scale, y: (svgP.y - view.ty) / view.scale };
  }

  function isBg(el: EventTarget | null) {
    if (!el) return false;
    const t = el as Element;
    return t.tagName === "svg" || t.hasAttribute?.("data-bg");
  }

  function onBgClick(e: React.MouseEvent) {
    if (mode !== "build") return;
    if (dialog) return;
    if (dragMoved.current) { dragMoved.current = false; return; }
    if (!isBg(e.target)) return;
    if (linkStart) { cancelLink(); return; }
    if (marquee) return;
    const p = toWorld(e.clientX, e.clientY);
    addNode(p.x, p.y);
  }

  function onBgMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    if (linkStart) return;
    if (!isBg(e.target)) return;

    if (mode === "build") {
      // Start marquee
      const p = toWorld(e.clientX, e.clientY);
      setMarquee({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    } else {
      // Start panning (drag area)
      setPanning({ startX: e.clientX, startY: e.clientY, startTx: view.tx, startTy: view.ty });
    }
  }

  useEffect(() => {
    if (!marquee) return;
    function move(e: MouseEvent) {
      const p = toWorld(e.clientX, e.clientY);
      setMarquee(m => m ? { ...m, x1: p.x, y1: p.y } : m);
    }
    function up() {
      const m = marquee;
      if (m) {
        const dx = Math.abs(m.x1 - m.x0), dy = Math.abs(m.y1 - m.y0);
        if (dx > 4 || dy > 4) {
          const minX = Math.min(m.x0, m.x1), maxX = Math.max(m.x0, m.x1);
          const minY = Math.min(m.y0, m.y1), maxY = Math.max(m.y0, m.y1);
          const inside = useSim.getState().nodes
            .filter(n => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY)
            .map(n => n.id);
          setSelectedNodes(inside);
          dragMoved.current = true;
        }
      }
      setMarquee(null);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marquee?.x0, marquee?.y0]);

  useEffect(() => {
    if (!panning) return;
    function move(e: MouseEvent) {
      const dx = e.clientX - panning!.startX;
      const dy = e.clientY - panning!.startY;
      setView(v => ({
        ...v,
        tx: panning!.startTx + dx,
        ty: panning!.startTy + dy,
      }));
      dragMoved.current = true;
    }
    function up() {
      setPanning(null);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [panning]);

  function onNodeClick(e: React.MouseEvent, n: RouterNode) {
    e.stopPropagation();
    if (dragMoved.current) { dragMoved.current = false; return; }
    if (mode === "build" && linkStart) {
      if (linkStart === n.id) { cancelLink(); return; }
      if (unweighted) { completeLink(n.id, 1); return; }
      // Open in-canvas weight dialog
      openWeightDialog(e.clientX, e.clientY, "1", (num) => completeLink(n.id, num));
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      toggleSelectedNode(n.id);
    } else {
      setSelectedNode(n.id);
    }
  }

  function onNodeDblClick(e: React.MouseEvent, n: RouterNode) {
    e.stopPropagation();
    if (mode !== "build") return;
    startLink(n.id);
  }

  function onNodeContext(e: React.MouseEvent, n: RouterNode) {
    e.preventDefault();
    e.stopPropagation();
    if (mode !== "build") return;
    const rect = wrapRef.current!.getBoundingClientRect();
    setDialog({ kind: "nodeMenu", x: e.clientX - rect.left, y: e.clientY - rect.top, nodeId: n.id });
  }

  function onNodeMouseDown(e: React.MouseEvent, n: RouterNode) {
    if (mode !== "build" && mode !== "drag") return;
    if (e.button !== 0) return;
    if (linkStart) return;
    setDragId(n.id);
    dragMoved.current = false;
    dragGroupPrev.current = toWorld(e.clientX, e.clientY);
  }

  useEffect(() => {
    if (!dragId) return;
    function move(e: MouseEvent) {
      const p = toWorld(e.clientX, e.clientY);
      const sel = useSim.getState().selectedNodes;
      if (sel.length > 1 && sel.includes(dragId!)) {
        const prev = dragGroupPrev.current;
        if (prev) {
          moveNodesBy(sel, p.x - prev.x, p.y - prev.y, { w: width, h: height });
          dragGroupPrev.current = p;
        }
      } else {
        moveNode(dragId!, Math.max(24, Math.min(width - 24, p.x)), Math.max(24, Math.min(height - 24, p.y)));
      }
      dragMoved.current = true;
    }
    function up() { setDragId(null); dragGroupPrev.current = null; }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId, view.scale, view.tx, view.ty]);

  function onSvgMove(e: React.MouseEvent) {
    if (linkStart && !dragId) setMouse(toWorld(e.clientX, e.clientY));
  }

  function onLinkClick(e: React.MouseEvent, l: Link) {
    e.stopPropagation();
    setSelectedLink(l.id);
  }
  function onLinkDblClick(e: React.MouseEvent, l: Link) {
    e.stopPropagation();
    if (mode !== "build" || unweighted) return;
    openWeightDialog(e.clientX, e.clientY, String(l.weight), (num) => setLinkWeight(l.id, num));
  }
  function onLinkContext(e: React.MouseEvent, l: Link) {
    e.preventDefault();
    e.stopPropagation();
    if (mode !== "build") return;
    const rect = wrapRef.current!.getBoundingClientRect();
    setDialog({ kind: "linkMenu", x: e.clientX - rect.left, y: e.clientY - rect.top, linkId: l.id });
  }

  function openWeightDialog(clientX: number, clientY: number, initial: string, onConfirm: (n: number) => void) {
    const rect = wrapRef.current!.getBoundingClientRect();
    setDialog({ kind: "weight", x: clientX - rect.left, y: clientY - rect.top, value: initial, onConfirm });
  }

  // Zoom on wheel
  function onWheel(e: React.WheelEvent) {
    if (!wrapRef.current) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomAround(e.clientX, e.clientY, factor);
  }
  function zoomAround(clientX: number, clientY: number, factor: number) {
    setView(v => {
      const svgP = toSVG(clientX, clientY);
      const newScale = Math.max(0.4, Math.min(2.5, v.scale * factor));
      // Keep point under cursor fixed:
      const tx = svgP.x - ((svgP.x - v.tx) / v.scale) * newScale;
      const ty = svgP.y - ((svgP.y - v.ty) / v.scale) * newScale;
      return { scale: newScale, tx, ty };
    });
  }
  function zoomButton(factor: number) {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    zoomAround(r.left + r.width / 2, r.top + r.height / 2, factor);
  }
  function resetView() { setView({ scale: 1, tx: 0, ty: 0 }); }

  // Delete key removes selection
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t?.tagName === "INPUT" || t?.tagName === "SELECT" || t?.tagName === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && useSim.getState().selectedNodes.length > 0) {
        e.preventDefault();
        useSim.getState().deleteNodes(useSim.getState().selectedNodes);
      } else if (e.key === "Escape") {
        setDialog(null);
        cancelLink();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelLink]);

  // Packet position (world coords)
  let packetPos: { x: number; y: number } | null = null;
  if (packetProgress !== null && path.length >= 2) {
    const i = Math.min(Math.floor(packetProgress), path.length - 2);
    const frac = packetProgress - i;
    const a = nodes.find(n => n.id === path[i]);
    const b = nodes.find(n => n.id === path[i + 1]);
    if (a && b) packetPos = { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
  }

  const nodeById = new Map(nodes.map(n => [n.id, n] as const));
  const selSet = new Set(selectedNodes);

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden rounded-md border border-border bg-[var(--panel)]"
      onWheel={onWheel}
    >
      {/* Hints */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[60%] space-y-1 font-mono text-[10px] text-muted-foreground">
        {mode === "build" && nodes.length === 0 && (
          <div className="text-accent">Click empty space to place a router.</div>
        )}
        {mode === "build" && nodes.length > 0 && (
          <>
            <div>Click background to add a router · drag to marquee-select</div>
            <div>Double-click a router to start a link · Ctrl/⌘+click to multi-select</div>
            <div>Right-click for context menu · Delete key removes selection</div>
          </>
        )}
        {linkStart && <div className="text-warn">Linking from {linkStart} — click target node</div>}
        {running && <div className="text-accent-3 soft-pulse">Simulation running…</div>}
      </div>

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md border border-border bg-[var(--panel-2)]/85 p-1 font-mono text-[10px] backdrop-blur">
        <button onClick={() => zoomButton(1 / 1.2)} className="h-6 w-6 rounded hover:bg-accent hover:text-black" title="Zoom out">−</button>
        <div className="w-10 text-center text-muted-foreground">{Math.round(view.scale * 100)}%</div>
        <button onClick={() => zoomButton(1.2)} className="h-6 w-6 rounded hover:bg-accent hover:text-black" title="Zoom in">+</button>
        <button onClick={resetView} className="ml-1 h-6 rounded px-2 hover:bg-accent hover:text-black" title="Reset view">⌂</button>
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 space-y-1 rounded-md border border-border bg-[var(--panel-2)]/85 p-2 font-mono text-[10px] backdrop-blur">
        <LegendDot color="var(--dim)" label="idle" />
        <LegendDot color="var(--warn)" label="in queue" />
        <LegendDot color="var(--accent)" label="visiting" />
        <LegendDot color="var(--accent-3)" label="settled" />
        <LegendDot color="var(--accent-2)" label="failed link" />
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className={`h-full w-full select-none ${
          mode === "drag"
            ? (dragId || panning)
              ? "cursor-grabbing"
              : "cursor-grab"
            : "cursor-crosshair"
        }`}
        onClick={onBgClick}
        onMouseDown={onBgMouseDown}
        onMouseMove={onSvgMove}
        data-bg
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect data-bg width={width} height={height} fill="transparent" />

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          {/* Links */}
          {links.map(l => {
            const a = nodeById.get(l.from); const b = nodeById.get(l.to);
            if (!a || !b) return null;
            const inPath = pathSet.has(l.from < l.to ? `${l.from}|${l.to}` : `${l.to}|${l.from}`);
            const isSel = selectedLink === l.id;
            const stroke = l.failed ? "var(--accent-2)" : inPath ? "var(--accent)" : isSel ? "var(--warn)" : "var(--border)";
            const strokeWidth = inPath ? 3 : isSel ? 2.5 : 1.5;
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            return (
              <g key={l.id} onClick={(e) => onLinkClick(e, l)} onDoubleClick={(e) => onLinkDblClick(e, l)} onContextMenu={(e) => onLinkContext(e, l)} className="cursor-pointer">
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={14} />
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={stroke} strokeWidth={strokeWidth}
                  strokeDasharray={l.failed ? "6 6" : undefined}
                  className={inPath ? "path-flow" : undefined}
                  style={inPath ? { filter: "drop-shadow(0 0 6px var(--accent))" } : undefined}
                />
                {!unweighted && (
                  <g transform={`translate(${mx}, ${my})`}>
                    <rect x={-14} y={-9} width={28} height={16} rx={4}
                      fill="var(--panel-2)" stroke={l.failed ? "var(--accent-2)" : "var(--border)"} />
                    <text textAnchor="middle" dy={4}
                      fontFamily="var(--font-mono)" fontSize={10}
                      fill={l.failed ? "var(--accent-2)" : "var(--foreground)"}>
                      {l.weight}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Link-in-progress preview */}
          {linkStart && mouse && (() => {
            const a = nodeById.get(linkStart); if (!a) return null;
            return <line x1={a.x} y1={a.y} x2={mouse.x} y2={mouse.y} stroke="var(--warn)" strokeWidth={1.5} strokeDasharray="4 4" />;
          })()}

          {/* Marquee */}
          {marquee && (
            <rect
              x={Math.min(marquee.x0, marquee.x1)}
              y={Math.min(marquee.y0, marquee.y1)}
              width={Math.abs(marquee.x1 - marquee.x0)}
              height={Math.abs(marquee.y1 - marquee.y0)}
              fill="rgba(77,214,255,0.08)"
              stroke="var(--accent)"
              strokeDasharray="4 3"
              strokeWidth={1}
            />
          )}

          {/* Nodes */}
          {nodes.map(n => {
            const ph = phases[n.id] ?? "idle";
            const isSrc = source === n.id;
            const isDst = destination === n.id;
            const isSel = selSet.has(n.id);
            let fill = "var(--panel-2)";
            let stroke = "var(--dim)";
            if (ph === "frontier") stroke = "var(--warn)";
            if (ph === "current") { stroke = "var(--accent)"; fill = "rgba(77,214,255,0.15)"; }
            if (ph === "settled") { stroke = "var(--accent-3)"; fill = "rgba(107,255,176,0.1)"; }
            if (isSrc) stroke = "var(--accent)";
            if (isDst) stroke = "var(--accent-2)";
            return (
              <g key={n.id}
                 onClick={(e) => onNodeClick(e, n)}
                 onDoubleClick={(e) => onNodeDblClick(e, n)}
                 onContextMenu={(e) => onNodeContext(e, n)}
                 onMouseDown={(e) => onNodeMouseDown(e, n)}
                 className={mode === "drag" ? (dragId ? "cursor-grabbing" : "cursor-grab") : "cursor-pointer"}
                 transform={`translate(${n.x}, ${n.y})`}>
                {isSel && (
                  <rect x={-20} y={-19} width={40} height={36} rx={6} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.85} />
                )}
                {ph === "current" && (
                  <rect x={-18} y={-17} width={36} height={30} rx={5} fill="none" stroke="var(--accent)" strokeWidth={2}>
                    <animate attributeName="width" from="36" to="48" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="height" from="30" to="40" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="x" from="-18" to="-24" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="y" from="-17" to="-22" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.8" to="0" dur="1.2s" repeatCount="indefinite" />
                  </rect>
                )}
                
                {/* Computer Stand & Base */}
                <rect x={-3} y={7} width={6} height={5} fill={stroke} opacity={0.9} />
                <path d="M-9,12 L9,12 L7,14 L-7,14 Z" fill={stroke} opacity={0.9} />
                
                {/* Computer Monitor Outer Frame */}
                <rect x={-16} y={-15} width={32} height={22} rx={3} ry={3} fill={fill} stroke={stroke} strokeWidth={isSel ? 3 : 2}
                  style={{ filter: (isSrc || isDst || ph !== "idle") ? `drop-shadow(0 0 6px ${stroke})` : undefined }} />
                  
                {/* Inner Screen */}
                <rect x={-13} y={-12} width={26} height={16} rx={1} ry={1} fill="black" opacity={0.4} />
                
                {/* Label text inside screen */}
                <text textAnchor="middle" y={-1} fontFamily="var(--font-mono)" fontSize={9} fill="var(--foreground)" className="font-bold">
                  {n.label}
                </text>
                {(isSrc || isDst) && (
                  <text textAnchor="middle" y={-22} fontFamily="var(--font-mono)" fontSize={9}
                        fill={isSrc ? "var(--accent)" : "var(--accent-2)"}>
                    {isSrc ? "SRC" : "DST"}
                  </text>
                )}
                {distances[n.id] !== undefined && (() => {
                  const dVal = distances[n.id];
                  const isInf = dVal === Infinity;
                  return (
                    <text
                      textAnchor="middle"
                      y={34}
                      fontFamily="var(--font-mono)"
                      fontSize={18}
                      fill={isInf ? "var(--muted-foreground)" : "var(--accent)"}
                      className={isInf ? "opacity-60" : "opacity-95 font-bold"}
                    >
                      {isInf ? "d=∞" : `d=${dVal}`}
                    </text>
                  );
                })()}
              </g>
            );
          })}

          {/* Packet */}
          {packetPos && (
            <g transform={`translate(${packetPos.x}, ${packetPos.y})`}>
              <circle r={8} fill="var(--accent)" filter="url(#glow)" opacity={0.9} />
              <circle r={4} fill="#fff" />
            </g>
          )}
        </g>
      </svg>

      {/* In-canvas dialogs */}
      {dialog?.kind === "weight" && (
        <div
          className="absolute z-20 rounded-md border border-accent bg-[var(--panel-2)] p-2 shadow-lg"
          style={{ left: Math.min(dialog.x, (wrapRef.current?.clientWidth ?? 400) - 200), top: dialog.y }}
        >
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Link weight</div>
          <input
            autoFocus
            type="number"
            value={dialog.value}
            onChange={(e) => setDialog({ ...dialog, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const n = Number(dialog.value);
                if (Number.isFinite(n)) dialog.onConfirm(n);
                setDialog(null);
              } else if (e.key === "Escape") {
                setDialog(null);
                cancelLink();
              }
            }}
            className="w-32 rounded border border-border bg-[var(--panel)] px-2 py-1 font-mono text-sm text-foreground focus:border-accent focus:outline-none"
          />
          <div className="mt-1 font-mono text-[9px] text-muted-foreground">Enter to confirm · Esc to cancel</div>
        </div>
      )}

      {dialog?.kind === "linkMenu" && (
        <FloatingMenu x={dialog.x} y={dialog.y} onClose={() => setDialog(null)}>
          {!unweighted && (
            <MenuItem onClick={() => {
              const l = links.find(x => x.id === dialog.linkId);
              if (!l) { setDialog(null); return; }
              openWeightDialog(0, 0, String(l.weight), (n) => setLinkWeight(l.id, n));
              // reposition weight dialog at same spot as menu
              setDialog({ kind: "weight", x: dialog.x, y: dialog.y, value: String(l.weight), onConfirm: (n) => setLinkWeight(l.id, n) });
            }}>Edit weight</MenuItem>
          )}
          <MenuItem onClick={() => { toggleLinkFailed(dialog.linkId); setDialog(null); }}>Toggle failure</MenuItem>
          <MenuItem danger onClick={() => { deleteLink(dialog.linkId); setDialog(null); }}>Delete link</MenuItem>
        </FloatingMenu>
      )}

      {dialog?.kind === "nodeMenu" && (
        <FloatingMenu x={dialog.x} y={dialog.y} onClose={() => setDialog(null)}>
          <MenuItem danger onClick={() => { deleteNode(dialog.nodeId); setDialog(null); }}>Delete router</MenuItem>
          <MenuItem onClick={() => setDialog(null)}>Cancel</MenuItem>
        </FloatingMenu>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      <span className="uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

function FloatingMenu({ x, y, children, onClose }: { x: number; y: number; children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    const t = setTimeout(() => window.addEventListener("mousedown", onDown), 0);
    return () => { clearTimeout(t); window.removeEventListener("mousedown", onDown); };
  }, [onClose]);
  return (
    <div
      ref={ref}
      className="absolute z-20 min-w-[160px] overflow-hidden rounded-md border border-border bg-[var(--panel-2)] shadow-xl"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left font-mono text-xs transition ${
        danger ? "text-accent-2 hover:bg-accent-2 hover:text-black" : "text-foreground hover:bg-accent hover:text-black"
      }`}
    >
      {children}
    </button>
  );
}
