import type { AuditCheck } from './types'

const draftProbe = 'blackoutbench-draft-probe'

export const draftPersistence: AuditCheck = async ({ page, targetUrl }) => {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })

  const found = await page
    .locator('textarea, input[type="text"], input:not([type])')
    .first()
    .isVisible()
    .catch(() => false)

  if (!found) {
    return {
      id: 'draftPersistence',
      name: 'Draft persistence',
      status: 'warn',
      summary: 'No draftable text field detected for this page.',
      evidence: 'No textarea/text input element was found.',
      recommendation: 'Run this check on a route containing a draft workflow.',
      label: 'Recoverable',
    }
  }

  const input = page.locator('textarea, input[type="text"], input:not([type])').first()
  await input.fill(draftProbe)
  await page.reload({ waitUntil: 'domcontentloaded' })

  const persisted = (await input.inputValue().catch(() => '')) === draftProbe

  if (!persisted) {
    return {
      id: 'draftPersistence',
      name: 'Draft persistence',
      status: 'fail',
      summary: 'Typed draft content is lost across page continuity breaks.',
      evidence: 'Draft probe value was not present after reload.',
      recommendation:
        'Persist in-progress authoring state locally before server confirmation.',
      label: 'Critical',
    }
  }

  return {
    id: 'draftPersistence',
    name: 'Draft persistence',
    status: 'pass',
    summary: 'Draft content survived a reload continuity break.',
    evidence: 'Draft probe value remained available after reload.',
    recommendation: 'Keep this local-first behavior for all authoring paths.',
    label: 'Strong',
  }
}
