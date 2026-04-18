import { chromium } from 'playwright'
import { scoreAudit } from '../../../packages/shared/src/scoring.js'
import type { AuditCheckResult, AuditReport } from '../../../packages/shared/src/types.js'
import { draftPersistence } from './audits/draftPersistence.js'
import { essentialUtility } from './audits/essentialUtility.js'
import { failureClarity } from './audits/failureClarity.js'
import { localAuthorityHint } from './audits/localAuthorityHint.js'
import { lowBandwidth } from './audits/lowBandwidth.js'
import { offlineReload } from './audits/offlineReload.js'
import { reconnect } from './audits/reconnect.js'
import { spinnerAbuse } from './audits/spinnerAbuse.js'
import type { AuditCheck } from './audits/types.js'
import { summarizeWithGemini } from './prompts/gemini.js'

const isCdpEndpoint = (endpoint: string) =>
  endpoint.includes('/devtools/browser/') || endpoint.includes('browserless.io/chromium')

const sanitizeEndpoint = (endpoint: string) => endpoint.replace(/token=[^&]+/i, 'token=***')

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string) =>
  Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
    }),
  ])

const connectBrowser = async () => {
  const cdpEndpoint = process.env.BROWSER_CDP_ENDPOINT?.trim()
  const wsEndpoint = process.env.BROWSER_WS_ENDPOINT?.trim()
  const timeoutMs = Number(process.env.BROWSER_CONNECT_TIMEOUT_MS ?? 15000)

  if (cdpEndpoint) {
    return {
      browser: await withTimeout(
        chromium.connectOverCDP(cdpEndpoint),
        timeoutMs,
        'Browser CDP connection',
      ),
      endpoint: sanitizeEndpoint(cdpEndpoint),
      mode: 'cdp' as const,
    }
  }

  if (wsEndpoint) {
    if (isCdpEndpoint(wsEndpoint)) {
      return {
        browser: await withTimeout(
          chromium.connectOverCDP(wsEndpoint),
          timeoutMs,
          'Browser CDP connection',
        ),
        endpoint: sanitizeEndpoint(wsEndpoint),
        mode: 'cdp' as const,
      }
    }

    return {
      browser: await withTimeout(
        chromium.connect(wsEndpoint),
        timeoutMs,
        'Browser websocket connection',
      ),
      endpoint: sanitizeEndpoint(wsEndpoint),
      mode: 'ws' as const,
    }
  }

  return {
    browser: await chromium.launch({ headless: true }),
    endpoint: 'local-chromium',
    mode: 'local' as const,
  }
}

const checks: { name: string; run: AuditCheck }[] = [
  { name: 'Offline reload', run: offlineReload },
  { name: 'Essential action survival', run: essentialUtility },
  { name: 'Draft persistence', run: draftPersistence },
  { name: 'Failure clarity', run: failureClarity },
  { name: 'Reconnect behavior', run: reconnect },
  { name: 'Low-bandwidth posture', run: lowBandwidth },
  { name: 'Local authority hint', run: localAuthorityHint },
  { name: 'Spinner abuse', run: spinnerAbuse },
]

export const runAudit = async (
  id: string,
  targetUrl: string,
  onEvent: (event: string, currentCheck?: string) => void,
): Promise<AuditReport> => {
  const startedAt = new Date().toISOString()
  const results: AuditCheckResult[] = []
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  let context: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newContext']>> | undefined

  onEvent('Audit execution started.')
  console.info(`[BlackoutBench][Audit ${id}] execution started`)

  try {
    onEvent('Connecting browser...')
    console.info(`[BlackoutBench][Audit ${id}] connecting browser`)
    const connection = await connectBrowser()
    browser = connection.browser
    onEvent(`Using browser endpoint: ${connection.endpoint}`)
    onEvent(`Browser connection mode: ${connection.mode}`)
    console.info(
      `[BlackoutBench][Audit ${id}] browser endpoint ${connection.endpoint} via ${connection.mode}`,
    )
    context =
      connection.mode === 'cdp' && browser.contexts().length
        ? browser.contexts()[0]
        : await browser.newContext()
    const page = await context.newPage()
    onEvent('Browser connected.')
    console.info(`[BlackoutBench][Audit ${id}] browser connected`)

    for (const check of checks) {
      onEvent(`Running ${check.name}...`, check.name)
      const result = await check.run({ page, context, targetUrl })
      results.push(result)
      onEvent(`${check.name}: ${result.status.toUpperCase()} — ${result.summary}`, check.name)
    }
  } finally {
    await context?.close()
    await browser?.close()
  }

  const score = scoreAudit(results)
  const gemini = await summarizeWithGemini(results)
  console.info(`[BlackoutBench][Audit ${id}] completed with gemini status ${gemini.status}`)

  return {
    id,
    url: targetUrl,
    startedAt,
    completedAt: new Date().toISOString(),
    checks: results,
    score: score.score,
    verdict: score.verdict,
    criticalFailures: score.criticalFailures,
    silentFailures: score.silentFailures,
    essentialActionSurvival: score.essentialActionSurvival,
    subscores: score.subscores,
    geminiStatus: gemini.status,
    gemini: gemini.guidance,
  }
}
