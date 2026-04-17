import type { BrowserContext, Page } from 'playwright'
import type { AuditCheckResult } from '../../../../packages/shared/src/types'

export interface AuditContext {
  page: Page
  context: BrowserContext
  targetUrl: string
}

export type AuditCheck = (ctx: AuditContext) => Promise<AuditCheckResult>
