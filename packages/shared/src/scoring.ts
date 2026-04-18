import type { AuditCheckResult, AuditSubscores, VerdictBand } from './types.js'

const penalties: Record<string, number> = {
  offlineReload: 20,
  essentialUtility: 25,
  draftPersistence: 20,
  failureClarity: 15,
  reconnect: 10,
  spinnerAbuse: 10,
}

const bonuses: Record<string, number> = {
  localAuthorityHint: 5,
  reconnect: 5,
}

const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, value))

const toBand = (score: number): VerdictBand => {
  if (score >= 80) return 'Survives pressure'
  if (score >= 60) return 'Degrades but usable'
  if (score >= 40) return 'Fragile'
  return 'Happy-path only'
}

export const scoreAudit = (checks: AuditCheckResult[]) => {
  let score = 100

  for (const check of checks) {
    if (check.status === 'fail') {
      score -= penalties[check.id] ?? 0
    }
    if (check.status === 'pass') {
      score += bonuses[check.id] ?? 0
    }
  }

  score = clamp(score)

  const byId = new Map(checks.map((check) => [check.id, check]))
  const subscores: AuditSubscores = {
    essentialUtility:
      byId.get('essentialUtility')?.status === 'pass'
        ? 90
        : byId.get('essentialUtility')?.status === 'warn'
          ? 60
          : 25,
    failureClarity:
      byId.get('failureClarity')?.status === 'pass'
        ? 90
        : byId.get('failureClarity')?.status === 'warn'
          ? 60
          : 30,
    stateSurvival:
      byId.get('draftPersistence')?.status === 'pass'
        ? 90
        : byId.get('draftPersistence')?.status === 'warn'
          ? 55
          : 20,
    recovery:
      byId.get('reconnect')?.status === 'pass'
        ? 90
        : byId.get('reconnect')?.status === 'warn'
          ? 60
          : 30,
    localResilience:
      byId.get('localAuthorityHint')?.status === 'pass'
        ? 85
        : byId.get('localAuthorityHint')?.status === 'warn'
          ? 55
          : 25,
  }

  return {
    score,
    verdict: toBand(score),
    criticalFailures: checks.filter((check) => check.label === 'Critical').length,
    silentFailures: checks.filter((check) => check.label === 'Silent').length,
    essentialActionSurvival: byId.get('essentialUtility')?.status === 'pass',
    subscores,
  }
}
