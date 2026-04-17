import type { AuditCheck } from './types'

export const offlineReload: AuditCheck = async ({ context, page, targetUrl }) => {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
  await context.setOffline(true)

  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10_000 })
  } catch {
    return {
      id: 'offlineReload',
      name: 'Offline reload',
      status: 'fail',
      summary: 'App shell did not recover during offline reload.',
      evidence: 'Reload while offline did not finish with a renderable state.',
      recommendation:
        'Pre-cache shell assets and provide an intentional offline fallback state.',
      label: 'Critical',
    }
  } finally {
    await context.setOffline(false)
  }

  const bodyTextLength = await page.evaluate(
    () => document.body?.innerText.trim().length ?? 0,
  )

  if (bodyTextLength < 20) {
    return {
      id: 'offlineReload',
      name: 'Offline reload',
      status: 'fail',
      summary: 'Page reloads offline but produces a near-blank state.',
      evidence: `Rendered text length after offline reload: ${bodyTextLength}.`,
      recommendation:
        'Ship an app shell and explicit degraded-state messaging for offline reload.',
      label: 'Critical',
    }
  }

  return {
    id: 'offlineReload',
    name: 'Offline reload',
    status: 'pass',
    summary: 'App presents a usable shell during offline reload.',
    evidence: `Rendered text length after offline reload: ${bodyTextLength}.`,
    recommendation: 'Maintain this fallback behavior as core resilience.',
    label: 'Strong',
  }
}
