import type { AuditCheck } from './types.js'

export const essentialUtility: AuditCheck = async ({ context, page, targetUrl }) => {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
  await context.setOffline(true)

  const offlineSignals = await page.evaluate(() => {
    const formControlCount = document.querySelectorAll(
      'textarea,input,button,select,a[href]',
    ).length
    const textLength = document.body?.innerText.trim().length ?? 0
    return { formControlCount, textLength }
  })

  await context.setOffline(false)

  if (offlineSignals.formControlCount > 0 || offlineSignals.textLength > 120) {
    return {
      id: 'essentialUtility',
      name: 'Essential action survival',
      status: 'pass',
      summary: 'Meaningful interaction remains available during disruption.',
      evidence: `Controls: ${offlineSignals.formControlCount}, text: ${offlineSignals.textLength}.`,
      recommendation: 'Keep preserving at least one offline-capable user task.',
      label: 'Strong',
    }
  }

  return {
    id: 'essentialUtility',
    name: 'Essential action survival',
    status: 'fail',
    summary: 'No meaningful utility remains once network is unstable.',
    evidence: `Controls: ${offlineSignals.formControlCount}, text: ${offlineSignals.textLength}.`,
    recommendation:
      'Preserve one essential flow locally (draft, read-only cache, queue, or export).',
    label: 'Critical',
  }
}
