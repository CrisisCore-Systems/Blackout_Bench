import type { AuditCheck } from './types'

export const spinnerAbuse: AuditCheck = async ({ context, page, targetUrl }) => {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
  await context.setOffline(true)

  const before = await page.evaluate(() => {
    return document.querySelectorAll('[aria-busy="true"], .spinner, [role="progressbar"]').length
  })

  await page.waitForTimeout(2_500)

  const after = await page.evaluate(() => {
    const spinnerCount = document.querySelectorAll(
      '[aria-busy="true"], .spinner, [role="progressbar"]',
    ).length
    const text = document.body?.innerText.toLowerCase() ?? ''
    const hasTimeoutCopy = ['timeout', 'try again', 'cancel', 'offline'].some((term) =>
      text.includes(term),
    )

    return { spinnerCount, hasTimeoutCopy }
  })

  await context.setOffline(false)

  if (after.spinnerCount > 0 && !after.hasTimeoutCopy && after.spinnerCount >= before) {
    return {
      id: 'spinnerAbuse',
      name: 'Spinner abuse',
      status: 'fail',
      summary: 'Loading state appears ambiguous without clear fallback or timeout path.',
      evidence: `Spinner count persisted from ${before} to ${after.spinnerCount}.`,
      recommendation:
        'Provide timeout messaging and an explicit cancel/retry path for waiting states.',
      label: 'Coercive',
    }
  }

  return {
    id: 'spinnerAbuse',
    name: 'Spinner abuse',
    status: 'pass',
    summary: 'No coercive indefinite loading loop was detected.',
    evidence: `Spinner count changed from ${before} to ${after.spinnerCount}.`,
    recommendation: 'Keep loading states bounded and user-controllable.',
    label: 'Strong',
  }
}
