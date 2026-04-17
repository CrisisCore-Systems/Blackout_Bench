import { useEffect, useState } from 'react'
import type { AuditProgress, AuditReport } from '../../../packages/shared/src/types'

const sampleUrl = 'https://example.com'

const scoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-300'
  if (score >= 60) return 'text-amber-300'
  if (score >= 40) return 'text-orange-300'
  return 'text-red-400'
}

const exportJson = (report: AuditReport) => {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `blackoutbench-${report.id}.json`
  link.click()
  URL.revokeObjectURL(url)
}

const exportPrintable = (report: AuditReport) => {
  const html = `<!doctype html><html><head><meta charset="UTF-8"/><title>BlackoutBench Report</title><style>body{font-family:Arial,sans-serif;background:#111;color:#eee;padding:24px}h1,h2{margin-bottom:8px}.metric{margin:6px 0}li{margin:8px 0}</style></head><body><h1>BlackoutBench Report</h1><p><strong>Target:</strong> ${report.url}</p><p class="metric"><strong>Survivability Score:</strong> ${report.score}</p><p class="metric"><strong>Verdict:</strong> ${report.verdict}</p><h2>Findings</h2><ul>${report.checks.map((check) => `<li><strong>${check.name}</strong> — ${check.status.toUpperCase()}<br/>${check.summary}<br/><em>${check.recommendation}</em></li>`).join('')}</ul></body></html>`
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `blackoutbench-${report.id}.html`
  link.click()
  URL.revokeObjectURL(url)
}

function App() {
  const [url, setUrl] = useState(sampleUrl)
  const [auditId, setAuditId] = useState<string>()
  const [progress, setProgress] = useState<AuditProgress>()
  const [selectedFinding, setSelectedFinding] = useState(0)
  const [error, setError] = useState<string>()

  const report = progress?.report

  const runBench = async () => {
    setError(undefined)
    setProgress(undefined)
    setAuditId(undefined)

    const res = await fetch('/api/audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string }
      setError(payload.error ?? 'Failed to start audit.')
      return
    }

    const payload = (await res.json()) as { auditId: string }
    setAuditId(payload.auditId)
  }

  useEffect(() => {
    if (!auditId) return

    const timer = window.setInterval(async () => {
      const res = await fetch(`/api/audits/${auditId}`)
      if (!res.ok) return
      const data = (await res.json()) as AuditProgress
      setProgress(data)
      if (data.status === 'done' || data.status === 'error') {
        window.clearInterval(timer)
      }
    }, 1200)

    return () => window.clearInterval(timer)
  }, [auditId])

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-6 text-slate-200 md:p-10">
      <section className="rounded-xl border border-slate-800 bg-black/50 p-6 shadow-[0_0_40px_rgba(255,60,60,0.08)]">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-400/90">
          Planetary stress harness
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-100 md:text-5xl">
          BlackoutBench
        </h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Does your app survive the real planet? Run a resilience audit against offline mode,
          weak signal, interrupted actions, and unstable infrastructure.
        </p>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100 outline-none ring-0 focus:border-amber-400"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://your-app.example"
          />
          <button
            onClick={runBench}
            className="rounded-md border border-red-700 bg-red-950 px-5 py-3 font-semibold text-red-100 hover:bg-red-900"
          >
            Run Bench
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-slate-400">
            Live audit console
          </h2>
          <p className="mt-2 text-slate-400">
            {progress?.status === 'running'
              ? `Current check: ${progress.currentCheck ?? 'initializing'}`
              : progress?.status === 'done'
                ? 'Audit complete.'
                : 'Paste a URL and run the bench.'}
          </p>

          <ul className="mt-4 max-h-64 space-y-2 overflow-auto pr-2 font-mono text-xs text-slate-300">
            {(progress?.events ?? [
              'Offline reload tested',
              'Draft survival checked',
              'Failure messaging scored',
              'Reconnect behavior inspected',
              'Gemini repair guidance included (optional key)',
            ]).map((event, index) => (
              <li key={`${event}-${index}`} className="rounded border border-slate-800 bg-black/50 p-2">
                {event}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-slate-400">How it works</h2>
          <ol className="mt-3 space-y-2 text-sm text-slate-300">
            <li>1. Paste URL</li>
            <li>2. Run stress audit</li>
            <li>3. Inspect breakpoints</li>
            <li>4. Fix what matters first</li>
          </ol>
          <p className="mt-6 text-xs text-slate-500">
            The planet does not care about your happy path.
          </p>
        </div>
      </section>

      {report ? (
        <section className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-red-900/50 bg-black/70 p-6 shadow-[0_0_50px_rgba(255,0,0,0.1)]">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-red-300">Result</p>
            <p className={`mt-3 text-6xl font-bold ${scoreColor(report.score)}`}>{report.score}</p>
            <p className="mt-2 text-xl text-slate-100">{report.verdict}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <p className="text-slate-400">Critical failures</p>
                <p className="mt-1 text-2xl text-red-300">{report.criticalFailures}</p>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <p className="text-slate-400">Silent failures</p>
                <p className="mt-1 text-2xl text-amber-300">{report.silentFailures}</p>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <p className="text-slate-400">Essential utility</p>
                <p className="mt-1 text-lg text-slate-100">
                  {report.essentialActionSurvival ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <p className="text-slate-400">Recovery</p>
                <p className="mt-1 text-lg text-slate-100">{report.subscores.recovery}/100</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => exportJson(report)}
                className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
              >
                Export JSON
              </button>
              <button
                onClick={() => exportPrintable(report)}
                className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
              >
                Export HTML report
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">Findings</h3>
            <ul className="mt-3 space-y-2">
              {report.checks.map((check, index) => (
                <li key={check.id}>
                  <button
                    onClick={() => setSelectedFinding(index)}
                    className={`w-full rounded border px-3 py-2 text-left text-sm ${
                      index === selectedFinding
                        ? 'border-amber-500 bg-amber-950/30 text-amber-200'
                        : 'border-slate-800 bg-black/40 text-slate-300'
                    }`}
                  >
                    {check.name}: {check.status.toUpperCase()}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {report?.checks[selectedFinding] ? (
        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-950/70 p-6">
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">Finding detail</h3>
          <h4 className="mt-2 text-xl text-slate-100">{report.checks[selectedFinding].name}</h4>
          <p className="mt-2 text-slate-300">{report.checks[selectedFinding].summary}</p>
          <p className="mt-3 text-sm text-slate-400">Evidence: {report.checks[selectedFinding].evidence}</p>
          <p className="mt-2 text-sm text-amber-200">
            Repair priority: {report.checks[selectedFinding].recommendation}
          </p>
        </section>
      ) : null}

      {report?.gemini ? (
        <section className="mt-6 rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-6">
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-indigo-300">Gemini guidance</h3>
          <p className="mt-2 text-slate-200">{report.gemini.summary}</p>
          <ul className="mt-3 list-disc pl-5 text-slate-300">
            {report.gemini.priorities.map((priority) => (
              <li key={priority}>{priority}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-400">{report.gemini.whyThisMatters}</p>
        </section>
      ) : null}
    </main>
  )
}

export default App
