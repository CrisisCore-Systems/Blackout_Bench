import type { AuditCheck } from './types.js'

export const localAuthorityHint: AuditCheck = async ({ page, targetUrl }) => {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })

  const hasLocalCapability = await page.evaluate(async () => {
    const hasServiceWorker = 'serviceWorker' in navigator
    const storageKeys = Object.keys(localStorage ?? {}).length
    let hasCaches = false

    if ('caches' in window) {
      try {
        hasCaches = (await caches.keys()).length > 0
      } catch {
        hasCaches = false
      }
    }

    return hasServiceWorker || hasCaches || storageKeys > 0
  })

  if (!hasLocalCapability) {
    return {
      id: 'localAuthorityHint',
      name: 'Local authority hint',
      status: 'warn',
      summary: 'No strong local resilience signal detected.',
      evidence: 'No cache/storage/service worker signal found.',
      recommendation: 'Add local persistence for core content and continuity state.',
      label: 'Recoverable',
    }
  }

  return {
    id: 'localAuthorityHint',
    name: 'Local authority hint',
    status: 'pass',
    summary: 'Local-first capability signals are present.',
    evidence: 'Storage/service worker/cache capability detected.',
    recommendation: 'Strengthen local authority around essential user flows.',
    label: 'Strong',
  }
}
