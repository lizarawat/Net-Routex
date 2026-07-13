
## Scope
Frontend polish + Leaflet geo canvas + Lovable Cloud persistence. Algorithms stay in TypeScript.

## 1. Enable Lovable Cloud (replaces "SQLite")
- Call `supabase--enable`.
- Add email/password + Google auth (Lovable Cloud defaults).
- Managed `_authenticated/route.tsx` layout gates saved-topologies pages.

### Schema (migration)
```
profiles(id uuid pk = auth.uid, display_name text, created_at)
topologies(id uuid pk, user_id uuid, name text, description text,
           is_public bool default false,
           nodes jsonb, links jsonb, view jsonb, -- {center,zoom,mode}
           created_at, updated_at)
sim_runs(id uuid pk, topology_id uuid fk, user_id uuid,
         algo text, source text, destination text,
         hops int, cost numeric, ms numeric, ops int,
         created_at)
```
GRANTs + RLS:
- `topologies`: SELECT to `anon` where `is_public=true`; owner CRUD via `auth.uid()=user_id`.
- `sim_runs`, `profiles`: owner-only.
- `service_role`: ALL on every table.
- Trigger `handle_new_user` inserts profile row.

## 2. Soften the "cyber terminal" tone (keep dark)
- Strip all `//` comment-style labels and "PETV70":
  - `src/routes/index.tsx` eyebrow + DSA cheatsheet strip
  - `src/routes/simulator.tsx` header subtitle + footer DSA-REF line
  - `src/components/simulator/NetworkCanvas.tsx` `▸ …` hint bullets
- Replace with sentence-case labels ("Data Structures & Algorithms project", "Tips", "Controls").
- Refine tokens in `src/styles.css`: warmer foreground (`#d5e6f1`), softer border (`#20415f`), lower grid overlay opacity, tone down `glow-cyan`, slow `path-flow`, remove `.blink` from status text (gentle pulse instead).

## 3. Header cleanup
- Drop `Learn` and `Compare` from the mode toggle (both were placeholders). Keep only `Build` and `Simulate`.
- New subtitle: "Routing Simulator" — no `//`, no code number.
- Add "Save" / "Load" / "Sign in" buttons (Save/Load only visible when signed in).

## 4. In-canvas modals (kill `prompt`/`confirm`)
New `<CanvasDialog>` component rendered inside the canvas wrapper:
- **Weight dialog**: number input, Enter=confirm, Esc=cancel. Used for both new link + edit weight.
- **Link context menu**: floating menu at cursor → Edit weight / Toggle failure / Delete.
- **Node context menu**: floating menu → Delete router / Cancel.
Local `useState` for `dialog | null`. Remove every `prompt()` / `confirm()`.

## 5. Unweighted mode
- Store flag `unweighted: boolean`.
- New "Unweighted graph" toggle in ControlPanel. When on: new links auto-weight=1 (skip dialog), edge labels hidden, hint suggests BFS.
- Separate "⚄ Random (unweighted)" button next to existing Random.

## 6. Speed slider actually syncs
Bug: `simEngine` snapshots `speed` once at run start.
- Read `useSim.getState().speed` fresh every tick.
- Recompute `delayMs` each iteration.
- Replace fixed-step packet animation with `requestAnimationFrame` + elapsed-time math so mid-run speed changes take effect immediately.
- Slider: 0.25× – 4×, 0.05 step, two-decimal display.

## 7. Canvas = Leaflet map (default) + abstract SVG mode toggle
- Add `react-leaflet` + `leaflet` via `bun add`.
- `src/components/simulator/LeafletCanvas.tsx`:
  - `<MapContainer>` with dark tile provider (CartoDB dark-matter — free, no API key).
  - Routers are custom `divIcon` markers at `{lat,lng}`. Click empty map → add router at that latlng. Drag marker → update coords.
  - Links as `<Polyline>` overlays with weight labels in `<Tooltip permanent>`.
  - Packet animated with a moving marker (rAF interpolation between latlngs, respecting live speed).
  - Phase colors via marker className swap.
- Store nodes gain optional `lat/lng`; existing `x/y` used only for the fallback abstract SVG canvas.
- Mode toggle in header: **Map** (default) / **Schematic** — Schematic renders existing `NetworkCanvas` unchanged.
- Zoom controls come from Leaflet natively. For Schematic mode, add zoom (wheel + `＋/−/⌂` buttons) as originally planned.

## 8. Multi-select + marquee (both canvases)
- Store `selectedNodes: Set<NodeId>` (keep `selectedNode` = last clicked for Inspector compat).
- Ctrl/Cmd+click a marker/node → toggle selection.
- Empty-space drag in build mode → marquee rectangle; nodes inside selected on release. In Leaflet, use a `L.Rectangle` overlay bound to mousedown/move/up on `map.getContainer()` (disable map dragging while marquee is active).
- Delete key → remove all selected. Dragging any selected node moves the group together (translate deltas).

## 9. Persistence UI (auth-gated)
- `/auth` — email/password + Google (via `lovable.auth.signInWithOAuth`).
- `/_authenticated/topologies` — list of user's saved graphs (cards: name, node/link count, updated). Load / Rename / Delete / Toggle public.
- `Save` button in simulator header:
  - If unnamed: modal asks name → insert row via `createServerFn` with `requireSupabaseAuth`.
  - If already loaded: updates existing row.
- `Load` button: dropdown of user's saved topologies.
- `/t/$slug` public route: read-only viewer for `is_public=true` topologies (server publishable client + narrow anon SELECT). Shareable link.
- Sim runs auto-logged to `sim_runs` when a signed-in user runs an algo against a saved topology.

Server functions live in `src/lib/topologies.functions.ts` and `src/lib/simruns.functions.ts` (client-safe path; handlers only).

## 10. Landing page features grid revamp
Six responsive cards, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, taller, inline SVG icon, 2–3 sentence body + "What you'll learn" line tying to a DSA concept:
- Graph editor · Four algorithms · Live visualization · Routing tables · Link failure & rerouting · Save & share (Cloud)
Hover: border → accent, subtle lift, smooth transition. Uses `min-w-0` / `truncate` responsive rules.

## 11. Small extras
- Keyboard: `+ / − / 0` zoom (schematic), `Delete` remove selection, `Enter` run, `Space` stop, `R` reset — all guarded against input focus.
- Route `head()` titles cleaned of `//` and "PETV70".
- Cheat sheet strip removed; algorithm complexity shown only in Inspector.

## Files touched
- **New**: `src/components/simulator/LeafletCanvas.tsx`, `src/components/simulator/CanvasDialog.tsx`, `src/routes/auth.tsx`, `src/routes/t.$slug.tsx`, `src/routes/_authenticated/topologies.tsx`, `src/lib/topologies.functions.ts`, `src/lib/simruns.functions.ts`, migration files
- **Edited**: `src/styles.css`, `src/routes/index.tsx`, `src/routes/simulator.tsx`, `src/routes/__root.tsx`, `src/components/simulator/ControlPanel.tsx`, `src/components/simulator/NetworkCanvas.tsx`, `src/lib/simEngine.ts`, `src/state/simStore.ts`, `package.json`
- **Skipped by design**: C++ engine, WASM, SQLite (Cloud/Postgres replaces it), Compare view, Learn button

## Out of scope
- Real-time multiplayer editing, mobile-first layout beyond responsive fixes, tests, i18n.

Proceed?
