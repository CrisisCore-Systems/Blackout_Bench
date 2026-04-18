# Runner Deploy Without Docker

The cleanest way to avoid a heavy Playwright container is to keep the runner as a lightweight Node service and move the browser runtime to a hosted browser provider.

## Recommended Shape

- Frontend on Vercel
- Runner on Railway as a plain Node service
- Browser execution on Browserless, Browserbase, or another hosted Playwright/Chromium provider

This keeps your deploy small because the runner does not need to launch a local browser binary.

## What Changed

The runner now supports these environment variables:

- `BROWSER_WS_ENDPOINT`
- `BROWSER_CDP_ENDPOINT`

If neither is set, it falls back to local `chromium.launch()` for local development.

## Recommended Provider Setup

Use one of these patterns:

1. Playwright WebSocket endpoint

```bash
BROWSER_WS_ENDPOINT=wss://YOUR-PLAYWRIGHT-ENDPOINT
```

1. Chrome DevTools Protocol endpoint

```bash
BROWSER_CDP_ENDPOINT=wss://YOUR-CDP-ENDPOINT
```

Only set one.

## Railway Deploy Path

1. Log in:

```bash
railway login
```

1. Create or link a project:

```bash
railway init
```

1. Set variables in Railway:

```bash
PORT=8787
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
BROWSER_WS_ENDPOINT=...
```

Optional:

```bash
GEMINI_API_KEY=...
```

1. Deploy as a normal Node service from the repository root:

```bash
railway up
```

## Why This Is Better

- no Docker image build on your machine
- no local Chromium bundle in the deployment target
- lower memory pressure on the runner service
- easier separation between app logic and browser infrastructure

## Remaining Requirement

The Vercel frontend needs this environment variable:

```bash
VITE_API_BASE_URL=https://YOUR-RUNNER-DOMAIN
```

That makes the deployed web app call the hosted runner instead of assuming `/api` is same-origin.
