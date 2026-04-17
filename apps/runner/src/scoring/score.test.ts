import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreAudit } from '../../../../packages/shared/src/scoring'

test('scoreAudit applies hard penalties for critical failures', () => {
  const result = scoreAudit([
    {
      id: 'essentialUtility',
      name: 'Essential action survival',
      status: 'fail',
      summary: '',
      evidence: '',
      recommendation: '',
      label: 'Critical',
    },
    {
      id: 'offlineReload',
      name: 'Offline reload',
      status: 'fail',
      summary: '',
      evidence: '',
      recommendation: '',
      label: 'Critical',
    },
  ])

  assert.equal(result.score, 55)
  assert.equal(result.verdict, 'Fragile')
  assert.equal(result.criticalFailures, 2)
  assert.equal(result.essentialActionSurvival, false)
})
