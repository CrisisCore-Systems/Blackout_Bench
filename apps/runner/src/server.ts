import { createServer, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import type { AuditProgress } from '../../../packages/shared/src/types'
import { runAudit } from './index'
import { normalizeTargetUrl } from './utils/url'

const port = Number(process.env.PORT ?? 8787)
const audits = new Map<string, AuditProgress>()

const send = (res: ServerResponse, status: number, payload: unknown) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  })
  res.end(JSON.stringify(payload))
}

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 200, { ok: true })
    return
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    send(res, 200, { ok: true })
    return
  }

  if (req.method === 'POST' && req.url === '/api/audits') {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))

    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { url?: string }
        const targetUrl = normalizeTargetUrl(body.url ?? '')
        const auditId = randomUUID()

        audits.set(auditId, {
          auditId,
          status: 'queued',
          events: ['Audit accepted. Queued for execution.'],
        })

        void runAudit(auditId, targetUrl, (event, currentCheck) => {
          const current = audits.get(auditId)
          if (!current) return
          current.status = 'running'
          current.currentCheck = currentCheck
          current.events.push(event)
        })
          .then((report) => {
            const current = audits.get(auditId)
            if (!current) return
            current.status = 'done'
            current.report = report
            current.currentCheck = undefined
            current.events.push('Audit complete.')
          })
          .catch((error: unknown) => {
            const current = audits.get(auditId)
            if (!current) return
            current.status = 'error'
            current.error = error instanceof Error ? error.message : 'Unknown audit failure'
            current.events.push(`Audit failed: ${current.error}`)
          })

        send(res, 202, { auditId })
      } catch (error: unknown) {
        send(res, 400, {
          error: error instanceof Error ? error.message : 'Invalid request payload',
        })
      }
    })

    return
  }

  if (req.method === 'GET' && req.url?.startsWith('/api/audits/')) {
    const auditId = req.url.replace('/api/audits/', '')
    const progress = audits.get(auditId)

    if (!progress) {
      send(res, 404, { error: 'Audit not found' })
      return
    }

    send(res, 200, progress)
    return
  }

  send(res, 404, { error: 'Not found' })
}).listen(port, () => {
  console.log(`BlackoutBench runner listening on http://localhost:${port}`)
})
