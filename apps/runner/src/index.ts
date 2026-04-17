import { chromium } from 'playwright'
import { scoreAudit } from '../../../packages/shared/src/scoring'
import type { AuditCheckResult, AuditReport } from '../../../packages/shared/src/types'
import { draftPersistence } from './audits/draftPersistence'
import { essentialUtility } from './audits/essentialUtility'
import { failureClarity } from './audits/failureClarity'
import { localAuthorityHint } from './audits/localAuthorityHint'
import { lowBandwidth } from './audits/lowBandwidth'
import { offlineReload } from './audits/offlineReload'
import { reconnect } from './audits/reconnect'
import { spinnerAbuse } from './audits/spinnerAbuse'
import type { AuditCheck } from './audits/types'
import { summarizeWithGemini } from './prompts/gemini'

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
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const startedAt = new Date().toISOString()
  const results: AuditCheckResult[] = []

  try {
    for (const check of checks) {
      onEvent(`Running ${check.name}...`, check.name)
      const result = await check.run({ page, context, targetUrl })
      results.push(result)
      onEvent(`${check.name}: ${result.status.toUpperCase()} — ${result.summary}`, check.name)
    }
  } finally {
    await context.close()
    await browser.close()
  }

  const score = scoreAudit(results)
  const gemini = await summarizeWithGemini(results)

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
    gemini,
  }
}
