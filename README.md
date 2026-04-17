# BlackoutBench

Planetary stress testing for web apps.

BlackoutBench audits how web apps behave under unstable real-world conditions like offline mode, weak signal, interrupted requests, and broken continuity. It runs a focused resilience battery and returns a survivability score, findings, and repair priorities.

## Why

Most software assumes stable infrastructure. Many users do not live inside that assumption.

## Features

- URL-based audit run
- Offline and reconnect checks
- State survival scoring
- Printable report export (JSON + HTML)
- Optional Gemini repair guidance synthesis

## Quick start

```bash
npm install
npm run dev:runner
# separate shell
npm run dev:web
```

Open the web app, paste a URL, and run the bench.

Optional Gemini support:

```bash
export GEMINI_API_KEY=your_key_here
npm run dev:runner
```

## How scoring works

Starts at 100. Deductions are explicit:

- Offline reload fail: -20
- Essential utility fail: -25
- Draft loss: -20
- Silent failure: -15
- Reconnect failure: -10
- Spinner trap: -10
- Strong local fallback: +5
- Clear reconnect recovery: +5

Verdicts:

- 80-100: Survives pressure
- 60-79: Degrades but usable
- 40-59: Fragile
- 0-39: Happy-path only

## Limitations

- Heuristic page classification
- Public pages only in v1
- No auth bypass
- Results are advisory, not compliance certification

## Roadmap

- Authenticated audits
- CI mode
- Repo-aware hints
- Accessibility under degradation
- Battery-saver assumptions
