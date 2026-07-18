# NetRouteX

NetRouteX is an interactive network routing simulator built to help students understand how data travels across a network and how routing algorithms find paths between routers.

The project works like a visual playground for graph algorithms. Users can create routers, connect them with weighted links, choose a routing algorithm, and watch how the algorithm explores the network step by step.

## Overview

NetRouteX focuses on teaching Data Structures and Algorithms through network routing visualization. Instead of only showing the final shortest path, it shows how the algorithm reaches that result through animated steps, routing tables, logs, pseudocode, and helper explanations.

## Features

- Interactive canvas for building a network topology
- Router placement using click actions
- Link creation between routers
- Weighted links for cost-based routing
- Unweighted graph mode for BFS-style comparison
- Algorithm support for:
  - Dijkstra
  - BFS
  - DFS
  - Bellman-Ford
- Animated packet/path visualization
- Shortest path highlighting
- Routing table generation
- Algorithm statistics panel
- Pseudocode viewer
- Event log panel
- Link failure simulation
- Backup route recalculation after failed links
- Import and export support for saved network topologies
- Random network generation
- Adjustable simulation speed
- Pause, resume, stop, and reset controls
- Lev AI Helper panel for plain-English explanations

## Lev AI Helper

Lev is a built-in helper panel that explains what is happening during the simulation in simple English.

While the algorithm runs, Lev explains important events such as:

- When the simulation starts
- Which router is currently being visited
- Which links are being checked
- When a better route is found
- When failed links are ignored
- When no route is available
- When the final shortest path is found

This makes the simulator easier to understand for beginners because users can connect the visual animation with the actual algorithm logic.

## Algorithms

### Dijkstra

Dijkstra's algorithm finds the shortest path in a weighted graph where all edge weights are non-negative. It is useful for understanding cost-based routing.

### BFS

Breadth-First Search explores the graph level by level. It is useful for unweighted graphs where every edge has the same cost.

### DFS

Depth-First Search explores as far as possible along one path before backtracking. It helps demonstrate traversal behavior.

### Bellman-Ford

Bellman-Ford finds shortest paths and can handle negative edge weights. It is useful for learning relaxation-based shortest path logic.

## How It Works

1. The user creates routers on the canvas.
2. Routers are connected using links.
3. Each link can have a weight or cost.
4. The user selects a source router and destination router.
5. The user chooses an algorithm.
6. The simulator runs the selected algorithm step by step.
7. The path, distances, routing table, logs, and explanations update in real time.
8. The final shortest path is highlighted on the canvas.

## Tech Stack

- React.js
- TypeScript
- Tailwind CSS
- TanStack Router
- TanStack Start
- Zustand
- SVG graphics
- Bun
- Vite

## Project Structure

```text
src/
  components/
    simulator/
      ControlPanel.tsx
      Inspector.tsx
      LevPanel.tsx
      NetworkCanvas.tsx

  lib/
    algorithms/
    graph/
    simEngine.ts
    utils.ts

  routes/
    index.tsx
    simulator.tsx

  state/
    simStore.ts
