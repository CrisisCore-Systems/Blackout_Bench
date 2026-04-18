# Runner Deploy on Railway

This deploy target is for the Playwright audit runner only.

The Vercel frontend is already live, but it still needs a separately hosted runner because the current audit engine depends on Playwright and a stateful in-memory job map.

## What This Deploy Uses

- `apps/runner/Dockerfile`
- Official Playwright base image with Chromium preinstalled
- Production start command: `npm --workspace apps/runner run start`
- Health endpoint: `/api/health`

## Before You Deploy

1. Log in to Railway:

```bash
railway login
```

2. Make sure Docker Desktop is running if Railway needs a local image build path.

## Create the Runner Service

From the repository root:

```bash
railway init
```

When prompted, create a new project or link the runner to an existing project.

## Deploy

From the repository root, deploy using the runner Dockerfile:

```bash
railway up --service blackoutbench-runner
```

If Railway asks for a root directory, use the repository root and let the Dockerfile inside `apps/runner` drive the build.

## Required Variables

Set these in Railway:

- `PORT=8787`
- `GEMINI_API_KEY=...` only if you want Gemini repair synthesis enabled

## Health Check

After deploy, confirm the runner responds:

```bash
curl https://YOUR-RUNNER-DOMAIN/api/health
```

Expected response:

```json
{"ok":true}
```

## Current Limitation

Deploying the runner alone does not automatically connect the Vercel frontend to it. The web app still needs an explicit API base URL setting so `/api/*` requests stop pointing at the same origin.