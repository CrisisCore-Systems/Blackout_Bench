import type { AuditCheck } from './types.js'

export const reconnect: AuditCheck = async ({ context, page, targetUrl }) => {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
  await context.setOffline(true)
  await page.waitForTimeout(800)
  await context.setOffline(false)

  const settled = await page
    .waitForLoadState('networkidle', { timeout: 10_000 })
    .then(() => true)
    .catch(() => false)

  if (!settled) {
    return {
      id: 'reconnect',
      name: 'Reconnect behavior',
      status: 'fail',
      summary: 'UI did not settle cleanly after connection return.',
      evidence: 'Page did not reach network idle after reconnect window.',
      recommendation: 'Implement explicit reconnect recovery and idempotent submissions.',
      label: 'Coercive',
    }
  }

  return {
    id: 'reconnect',
    name: 'Reconnect behavior',
    status: 'pass',
    summary: 'Interface recovered after simulated connection return.',
    evidence: 'Page reached stable network idle after reconnect.',
    recommendation: 'Continue guarding against duplicate actions on retry paths.',
    label: 'Recoverable',
  }
}
