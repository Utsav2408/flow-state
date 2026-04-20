# Flow State - AI Crowd Flow Optimizer

Flow State is an AI-powered stadium operations and fan experience simulator built for the Google Challenge.
It predicts crowd pressure in real time, routes fans with congestion-aware pathfinding, and coordinates post-match egress waves to reduce bottlenecks and wait time.

## Live Demo

- [https://flow-state-demo-d66e0.web.app](https://flow-state-demo-d66e0.web.app)

## What This Project Does

- Simulates 40,000 fans moving through zones, concourses, food stands, and exits
- Computes live comfort and density metrics per section
- Uses batch-based Nash-style routing to distribute fans across alternative destinations
- Provides operator controls for match events (halftime, goal, rain delay, post-match)
- Generates personalized fan guidance and coordinated egress plans

## Product Surfaces

- **Fan app**: Comfort score, smart action cards, route suggestions, and egress countdown
- **Operator dashboard**: Live crowd KPIs, alerts, triggerable events, and global control panel

## AI / Intelligence Components

- **Congestion-aware routing** in `src/intelligence/routingEngine.js`
  - Dijkstra shortest paths with dynamic edge-load penalties
  - Nash-style batched decisions to avoid everyone picking the same path
- **Comfort scoring** in `src/intelligence/comfortScoring.js`
  - Converts density + wait pressure into a single actionable score
- **Egress orchestration** in `src/intelligence/egressChoreographer.js`
  - Wave-based gate assignment and departure timing for smoother exits

## Tech Stack

- React 19 + Vite
- Zustand state management
- Firebase Realtime Database
- Web Worker simulation loop
- Vitest + Testing Library

## Repository Structure

- `src/` - main application code (frontend, simulation engine, intelligence modules)
- `src/pages/` - fan and operator page-level views
- `src/simulation/` - crowd simulation worker and runtime loop
- `src/intelligence/` - routing, comfort, and egress logic
- `src/store/` - shared app state and realtime subscriptions

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+

### Install and Run

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173` by default.

## Verification

From the repository root:

```bash
npm run lint
npm run test:run
npm run build
```

Or run everything in sequence:

```bash
npm run verify
```

## Environment

The app expects Firebase client configuration via environment variables in `.env`.
Use your own Firebase project values for local setup if needed.

## Challenge Value

Flow State demonstrates how AI-assisted crowd decisioning can improve both fan experience and venue operations by:

- lowering average queue times
- reducing route conflicts and choke points
- improving comfort in high-density zones
- coordinating safer, more predictable stadium egress
