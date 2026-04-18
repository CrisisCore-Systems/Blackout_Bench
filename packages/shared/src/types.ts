export type FindingLabel =
  | 'Critical'
  | 'Silent'
  | 'Coercive'
  | 'Recoverable'
  | 'Strong'

export type CheckStatus = 'pass' | 'fail' | 'warn'

export type CheckId =
  | 'offlineReload'
  | 'essentialUtility'
  | 'draftPersistence'
  | 'failureClarity'
  | 'reconnect'
  | 'lowBandwidth'
  | 'localAuthorityHint'
  | 'spinnerAbuse'

export interface AuditCheckResult {
  id: CheckId
  name: string
  status: CheckStatus
  summary: string
  evidence: string
  recommendation: string
  label: FindingLabel
}

export interface AuditSubscores {
  essentialUtility: number
  failureClarity: number
  stateSurvival: number
  recovery: number
  localResilience: number
}

export type VerdictBand =
  | 'Survives pressure'
  | 'Degrades but usable'
  | 'Fragile'
  | 'Happy-path only'

export interface GeminiGuidance {
  summary: string
  priorities: string[]
  whyThisMatters: string
}

export type GeminiStatus =
  | 'attached'
  | 'missing_api_key'
  | 'no_actionable_failures'
  | 'request_failed'
  | 'upstream_failed'
  | 'missing_text'
  | 'invalid_json'
  | 'invalid_shape'

export interface AuditReport {
  id: string
  url: string
  startedAt: string
  completedAt: string
  score: number
  verdict: VerdictBand
  criticalFailures: number
  silentFailures: number
  essentialActionSurvival: boolean
  checks: AuditCheckResult[]
  subscores: AuditSubscores
  geminiStatus: GeminiStatus
  gemini?: GeminiGuidance
}

export interface AuditProgress {
  auditId: string
  status: 'queued' | 'running' | 'done' | 'error'
  currentCheck?: string
  events: string[]
  report?: AuditReport
  error?: string
}
