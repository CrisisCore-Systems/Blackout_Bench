# BlackoutBench

**Does your app survive the real planet?**

BlackoutBench is a planetary stress harness for web apps. It tests what survives when stability assumptions fail: offline mode, weak signal, interrupted actions, degraded continuity, and fragile infrastructure.

Most software is built for the happy path.

Stable network. Full battery. Unbroken attention. Clean reloads. Predictable recovery.

Real life does not guarantee any of that.

BlackoutBench exists to make fragility visible.

It runs a focused resilience audit against an app, then returns a blunt inspection outcome:

- Survivability Score
- Critical Failures
- Silent Failures
- Essential Utility
- Repair First

The goal is not observability theater.
The goal is to reveal what breaks when the environment stops cooperating.

## Why

A lot of software quality work still assumes failure is exceptional.

But for many users, instability is the environment:

- weak connectivity
- suspended tabs
- old devices
- interrupted sessions
- partial loads
- inconsistent recovery
- pressure, fatigue, and reduced attention

When software assumes stability, it pushes fragility downstream onto the user.

BlackoutBench tests whether your product remains useful after those assumptions start collapsing.

## What It Checks

BlackoutBench focuses on a small set of resilience conditions:

- offline reload behavior
- essential utility survival
- draft persistence
- failure clarity
- reconnect behavior
- low-bandwidth posture
- local resilience hints
- spinner abuse and ambiguous waiting states

## Scoring

BlackoutBench returns a **Survivability Score** from 0 to 100.

Verdicts:

- **Survives pressure**
- **Degrades but usable**
- **Fragile**
- **Happy-path only**

The score is not the point by itself.

The point is the failure pattern:

- what broke
- what failed silently
- what remained usable
- what should be repaired first

## Gemini Integration

BlackoutBench can optionally use Gemini to synthesize repair guidance from audit findings.

Gemini does not decide the verdict.
The checks produce the result.
Gemini helps compress likely next steps into human-readable diagnosis and repair direction.

## Quick Start

Install dependencies:

```bash
npm install
```

Run the web app:

```bash
npm run dev:web
```

To point the frontend at a hosted runner in development or production:

```bash
VITE_API_BASE_URL=https://your-runner.example.com npm run dev:web
```

Run the audit runner:

```bash
npm run dev:runner
```

Open the app, paste a URL, and run a bench.

Optional Gemini support:

```bash
GEMINI_API_KEY=your_key_here npm run dev:runner
```

Optional remote browser support for lightweight runner hosting:

```bash
BROWSER_WS_ENDPOINT=wss://your-provider-endpoint npm run dev:runner
```

or:

```bash
BROWSER_CDP_ENDPOINT=wss://your-cdp-endpoint npm run dev:runner
```

## Deploy Notes

If you deploy the frontend separately on Vercel, set:

```bash
VITE_API_BASE_URL=https://your-runner.example.com
```

This makes the web app call the hosted runner instead of assuming `/api` is same-origin.

## Validation

Current MVP status:

- monorepo structure in place
- runner API implemented
- web flow implemented
- scoring and verdict model implemented
- lint, build, and test passing
- manual end-to-end audit flow verified

## Limitations

BlackoutBench is intentionally narrow in v1.

It does not try to be:

- a full crawler
- a CI platform
- an authenticated deep-flow auditor
- a compliance framework
- an observability suite

It is a focused resilience instrument.

## Roadmap

Planned directions:

- stronger authenticated flow support
- CI-friendly execution mode
- richer failure evidence capture
- resilience baselines across app types
- expanded degraded-mode checks

## Thesis

Most apps assume stability.

BlackoutBench punishes that assumption.

The planet does not care about your happy path.
