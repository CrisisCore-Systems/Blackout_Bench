import type { AuditCheck } from './types'

export const lowBandwidth: AuditCheck = async ({ context, page, targetUrl }) => {
  await context.route('**/*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    await route.continue()
  })

  const started = Date.now()
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
  const elapsedMs = Date.now() - started
  await context.unroute('**/*')

  if (elapsedMs > 12_000) {
    return {
      id: 'lowBandwidth',
      name: 'Low-bandwidth posture',
      status: 'fail',
      summary: 'App appears brittle when requests are delayed.',
      evidence: `Delayed load took ${elapsedMs}ms.`,
      recommendation:
        'Prioritize critical assets, reduce blocking scripts, and lazy-load non-essentials.',
      label: 'Recoverable',
    }
  }

  return {
    id: 'lowBandwidth',
    name: 'Low-bandwidth posture',
    status: 'pass',
    summary: 'App remains usable under delayed network conditions.',
    evidence: `Delayed load took ${elapsedMs}ms.`,
    recommendation: 'Maintain this constrained-network posture as default quality.',
    label: 'Strong',
  }
}
