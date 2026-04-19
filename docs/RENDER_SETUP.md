# Render Setup

Use Render for the runner only.

The frontend stays on Vercel. The runner becomes a separate Node web service that talks to a hosted browser provider.

## What You Need First

1. A Render account
2. Your GitHub repo connected to Render
3. A hosted browser endpoint from Browserless, Browserbase, or a similar provider

## Fastest Path

This repo now includes [render.yaml](../render.yaml).

In Render:

1. Click `New`
2. Click `Blueprint`
3. Select the `Blackout_Bench` GitHub repository
4. Let Render detect `render.yaml`
5. Create the service

That will create a web service named `blackoutbench-runner` with:

- build command: `npm install && npm --workspace apps/runner run build`
- start command: `npm --workspace apps/runner run start`
- health check: `/api/health`

## Required Environment Variables

Set these in the Render service dashboard:

1. `BROWSER_WS_ENDPOINT`
   For Browserless BaaS v2, use a websocket browser URL such as `wss://production-sfo.browserless.io?token=YOUR_TOKEN`.

2. `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true`
   Keeps the service lightweight by avoiding local browser download.

If you have a true CDP endpoint instead, set `BROWSER_CDP_ENDPOINT`.

Optional:

1. `GEMINI_API_KEY`
   Only if you want Gemini repair synthesis enabled.

2. `GEMINI_MODEL=gemini-2.5-flash`
   Use this to override the default model if Google retires or changes model endpoints.

3. `GEMINI_API_VERSION=v1beta`
   Use this if the model you are calling is only exposed on a different Gemini API version such as `v1` vs `v1beta`.

## Verify the Runner

After deploy, open either:

`https://YOUR-RENDER-SERVICE.onrender.com/`

or:

`https://YOUR-RENDER-SERVICE.onrender.com/api/health`

You should get:

```json
{"ok":true}
```

## Connect the Vercel Frontend

In Vercel, add this environment variable for the frontend:

`VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com`

Then redeploy the Vercel site.

## If You Do Not Want Blueprints

You can create a `Web Service` manually with these values:

- Language: `Node`
- Root Directory: repo root
- Build Command: `npm install && npm --workspace apps/runner run build`
- Start Command: `npm --workspace apps/runner run start`
- Health Check Path: `/api/health`

## Important Limitation

Render is hosting the runner logic, not the browser itself. The browser work is expected to come from the hosted endpoint you provide in `BROWSER_WS_ENDPOINT` or `BROWSER_CDP_ENDPOINT`.
