# FlowState — AI-Powered Stadium Crowd Intelligence

**What if 60,000 phones could think together?**

FlowState is an AI-powered platform that transforms the physical event experience at large-scale sporting venues. Instead of managing crowds from a control room, FlowState puts intelligence in every fan's pocket — turning their phone into both a sensor and a personal guide.

Every fan gets real-time, personalized guidance: the fastest food stand, the optimal route that avoids congestion, a smart meetup point for their friend group, and a choreographed exit plan when the match ends. Meanwhile, operators get a live command dashboard with crowd density heatmaps, automated alerts, and simulation controls.

**Built for [PromptWars Virtual 2026](https://promptwars.in/) — Build with AI initiative by Google for Developers & Hack2Skill.**

🔗 **[Live Demo](https://flow-state-demo-d66e0.web.app/)** · 📝 **[Blog Post](#)** · 💼 **[LinkedIn Post](#)**

---

## The Problem

At a 40,000-seat cricket match:
- **Halftime chaos**: 60% of fans rush to food stands simultaneously — everyone goes to the nearest one, creating 15-min queues while other stands sit empty
- **Lost friends**: Groups split up and spend 20+ minutes texting "where are you?" instead of watching the match
- **Exit stampede**: All 40,000 fans funnel through the same gates, turning a 4-minute walk into a 35-minute ordeal

Every existing solution attacks this from the operator's side — CCTV dashboards, IoT sensors, command center analytics. But an operator can't individually guide 40,000 fans.

**FlowState flips this**: the fans themselves are both the sensors and the solution.

---

## Features

### 🏟️ For Fans

**Comfort Score (0-100)**
A single number that tells you how your section feels right now — combining crowd density, food wait times, and noise levels. Green means great, red means move.

**Nash-Optimal Routing**
When 200 fans want food at halftime, the system doesn't send everyone to the nearest stand. It uses game theory (Nash equilibrium) to distribute fans across all stands so everyone's wait time drops by 35-45%.

**Group Meetup Intelligence**
Your friends show up as colored dots on the stadium map. The system computes the optimal meeting point — not just the geographic center, but a spot that's also uncrowded. One tap to ping everyone.

**Crowd Shaping via Rewards**
Instead of pushing fans away from crowded areas, the system pulls them toward empty zones with targeted incentive offers ("2x points at Stand 12 — 90m away, expires in 8 min").

**Egress Choreography**
When the match ends, every fan gets a personalized exit plan: countdown timer, gate assignment, staggered departure wave, and a wait incentive ("Free coffee if you leave 3 min later — skip 78% of congestion"). Groups exit together.

**AI-Powered Recommendations**
Gemini Flash generates natural-language action recommendations based on live conditions ("Grab food now — Stand 12 has a 1 min wait and your route is clear").

### 📊 For Operators

**Live Crowd Density Heatmap**
Real-time venue map with color-coded zones (green/amber/red), concession stand wait times, and gate labels. Zoom and pan to inspect specific areas.

**Automated Alert Feed**
AI-generated alerts when zones exceed capacity, queues spike, or routing reduces congestion — with timestamps and severity indicators.

**Simulation Controls**
Speed controls (1x / 5x / 20x) and event triggers (Halftime, Goal, Rain Delay, Final Whistle) to test system response across the full match lifecycle.

**Role-Based Access**
Firebase Authentication (Google + email/password) with fan/admin roles. Only admins can access the operator dashboard.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router v7, Tailwind CSS v4, Vite 8 |
| State Management | Zustand |
| Backend | Firebase Realtime Database |
| Auth | Firebase Authentication (Google OAuth + Email/Password) |
| AI | Gemini 2.0 Flash (`generateContent`) |
| Map Rendering | HTML5 Canvas API (HiDPI/Retina support) |
| Routing Algorithm | Dijkstra + Nash-equilibrium batch distribution |
| Testing | Vitest + Testing Library + jsdom |
| CI | GitHub Actions (`lint` + `test:run` + `build`) |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│           Fan Device Layer                   │
│   GPS · Wi-Fi · BLE · Accelerometer (future) │
└──────────────────┬──────────────────────────┘
                   │ Telemetry
┌──────────────────▼──────────────────────────┐
│         AI Coordination Engine               │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐  │
│  │  Crowd   │ │   Nash    │ │ Incentive  │  │
│  │Simulator │ │Equilibrium│ │ Optimizer  │  │
│  └──────────┘ └───────────┘ └────────────┘  │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐  │
│  │ Comfort  │ │  Egress   │ │  Gemini    │  │
│  │ Scoring  │ │Choreograph│ │  Flash     │  │
│  └──────────┘ └───────────┘ └────────────┘  │
└──────────────────┬──────────────────────────┘
                   │ Personalized guidance
┌──────────────────▼──────────────────────────┐
│         Fan Experience Output                │
│   Route guidance · Comfort score · Alerts    │
│   Group sync · Incentives · Exit plan        │
└─────────────────────────────────────────────┘
```

---

## Project Structure

```
flow-state/
├── src/
│   ├── auth/                        # Auth context + hooks
│   │   ├── AuthContext.jsx
│   │   └── useAuth.js
│   ├── components/                  # App shell + guards + shared UI
│   │   ├── FanAppBootstrap.jsx
│   │   ├── RequireAuth.jsx
│   │   ├── ProtectedOperator.jsx
│   │   ├── VenueMapCanvas.jsx
│   │   └── Shared.jsx
│   ├── pages/                       # Fan + operator routes
│   │   ├── HomePage.jsx
│   │   ├── MapPage.jsx
│   │   ├── GroupPage.jsx
│   │   ├── RewardsPage.jsx
│   │   ├── EgressPage.jsx
│   │   ├── LoginPage.jsx
│   │   └── OperatorPage.jsx
│   ├── operator/                    # Operator dashboard subcomponents
│   ├── intelligence/                # Routing + comfort + egress logic
│   ├── simulation/                  # Crowd simulator + worker
│   ├── models/                      # Venue graph/layout models
│   ├── services/                    # Gemini integration
│   ├── store/                       # Zustand store + Firebase subscriptions
│   ├── config/                      # Domain constants/config
│   ├── utils/                       # Canvas paint + layout helpers
│   ├── App.jsx                      # Router entry
│   ├── main.jsx                     # React root + providers
│   └── firebase.js                  # Firebase bootstrap + optional seeding
├── .github/workflows/ci.yml         # Lint, test, build pipeline
├── .env.example                     # Required env vars template
├── database.rules.json
├── package.json
└── vite.config.js
```

---

## Getting Started

### Prerequisites
- Node.js 20+ (recommended; CI runs Node 22)
- A Firebase project with Realtime Database + Authentication enabled
- A Gemini API key ([get one free](https://aistudio.google.com/apikey))

### Installation

```bash
git clone https://github.com/Utsav2408/flow-state.git
cd flow-state
npm install
```

### Environment Setup

Copy the env template and fill values:

```bash
cp .env.example .env
```

Then update `.env`:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_SEED_DATABASE=false
```

`VITE_SEED_DATABASE=true` performs a **destructive** one-time seed of simulation paths (`simulation`, `zones`, `stands`, `alerts`) and should only be enabled intentionally.

### Run Locally

```bash
npm run dev
```

Open:
- Fan app: `http://localhost:5173/`
- Operator dashboard: `http://localhost:5173/operator` (admin role required)

### Available Scripts

```bash
npm run dev       # local dev server
npm run lint      # eslint
npm run test      # watch mode tests
npm run test:run  # one-shot tests
npm run build     # production build
npm run preview   # preview built app
npm run verify    # lint + test:run + build
```

### Deploy

```bash
npm run build
firebase deploy --only hosting
```

---

## How the Simulation Works

FlowState simulates 40,000 fans with realistic behavior patterns:

- **Pre-match**: Fans stream in through 4 gates following a normal distribution peaking 15 min before kickoff
- **Live play**: 85% seated, 10% walking to food/restrooms, 5% queuing
- **Halftime**: 40% surge — 60% to food, 25% to restrooms, 15% wander
- **Goal scored**: Brief 5% celebration spike, normalizes in 2 minutes
- **Post-match**: Staggered egress across 4 waves with gate assignments

The operator dashboard lets you trigger these events and watch the system respond at 1x, 5x, or 20x speed.

---

## Key Algorithms

### Nash-Optimal Routing
When multiple fans request routes simultaneously, the system batches requests and assigns each fan to a destination using congestion-aware Dijkstra. After each assignment, edge weights are updated before processing the next fan — creating a Nash equilibrium where no fan can unilaterally improve their outcome.

### Comfort Scoring
```
comfort = 100 - (density × 0.5 + waitPenalty × 0.3 + noisePenalty × 0.2)
```
Where `waitPenalty = min(nearestWait / 15, 1) × 100` and `noisePenalty = density × 1.2`

### Egress Choreography
Fans are divided into waves by zone proximity to gates. Departure times are staggered by 2-minute intervals. Groups are kept together when possible. Wait incentives (free coffee) reduce voluntary departure urgency.

---

## What's Simulated vs What's Production-Ready

| Feature | Current State | Production Path |
|---------|--------------|-----------------|
| Fan positions | Simulated (40K agents) | GPS + Wi-Fi + BLE beacons |
| Crowd density | Computed from simulation | Real sensor telemetry |
| Nash routing | Fully functional | Same algorithm, real inputs |
| Comfort scoring | Fully functional | Add temperature, weather |
| Group sync | Hardcoded demo group | Real user accounts + friends |
| Egress choreography | Functional with sim data | Same logic, real gate sensors |
| Gemini recommendations | Live API calls | Same, add personalization |

The architecture is designed so that swapping the simulation for real sensor data requires zero changes to the intelligence layer.

---

## Auth & Roles

- `RequireAuth` protects all fan routes.
- `ProtectedOperator` additionally checks admin role (`userRoles/{uid} === "admin"` in Firebase RTDB).
- Login supports both Google OAuth and email/password.
- If Firebase env vars are missing, login shows a setup screen instead of failing silently.

---

## Built With Google Antigravity

This entire application was built using Google Antigravity with a model rotation strategy:

- **Gemini 3.1 Pro**: Scaffolding, large code generation, Firebase setup
- **Claude Sonnet 4.6**: UI iteration, CSS polish, debugging
- **Claude Opus 4.6**: Nash routing algorithm (hardest logic)

---

*Built for PromptWars Virtual 2026 — the future of stadium experiences isn't about controlling crowds, it's about empowering them.*