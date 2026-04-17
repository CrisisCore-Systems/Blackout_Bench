import type { AuditCheck } from './types'

const actionableTerms = ['offline', 'retry', 'reconnect', 'try again', 'connection']

export const failureClarity: AuditCheck = async ({ context, page, targetUrl }) => {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
  await context.setOffline(true)

  await page.evaluate(async () => {
    try {
      await fetch('/__blackoutbench_probe__', { cache: 'no-store' })
    } catch {
      // expected under offline mode
    }
  })

  const pageText = await page.evaluate(() => document.body?.innerText.toLowerCase() ?? '')
  await context.setOffline(false)

  const hasActionableFailure = actionableTerms.some((term) => pageText.includes(term))

  if (!hasActionableFailure) {
    return {
      id: 'failureClarity',
      name: 'Failure clarity',
      status: 'fail',
      summary: 'Failure state is not clearly explained with next actions.',
      evidence: 'No actionable failure language detected during offline fault.',
      recommendation:
        'Explain what failed, what still works, and next steps in plain language.',
      label: 'Silent',
    }
  }

  return {
    id: 'failureClarity',
    name: 'Failure clarity',
    status: 'pass',
    summary: 'App surfaces actionable guidance during failure.',
    evidence: 'Actionable language detected during induced offline fault.',
    recommendation: 'Keep explicit failure messaging tied to real system states.',
    label: 'Strong',
  }
}
