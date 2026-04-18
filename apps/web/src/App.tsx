import { useEffect, useState } from 'react'
import type { AuditProgress, AuditReport } from '../../../packages/shared/src/types'
import { sampleReport } from './sampleReport'

const sampleUrl = 'https://example.com'
const proofStrip = [
  'Offline reload tested',
  'Draft survival checked',
  'Failure clarity scored',
  'Reconnect behavior inspected',
  'Repair priorities generated',
]
const processSteps = [
  {
    title: '1. Paste a URL',
    body: 'Point BlackoutBench at a public web app.',
  },
  {
    title: '2. Run a planetary stress audit',
    body: 'Check offline reloads, continuity, failure clarity, reconnect behavior, and state survival.',
  },
  {
    title: '3. Inspect the verdict',
    body: 'Get a Survivability Score, Critical Failures, Silent Failures, and a Repair First summary.',
  },
  {
    title: '4. Export the report',
    body: 'Save a printable result that makes fragility legible.',
  },
]
const verdictBands = [
  'Survives pressure',
  'Degrades but usable',
  'Fragile',
  'Happy-path only',
]
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '')
const apiUrl = (path: string) => `${apiBaseUrl}${path}`

const getFindingTone = (label: AuditReport['checks'][number]['label']) => {
  if (label === 'Critical') {
    return {
      itemClass: 'finding-item--critical',
      chipClass: 'severity-chip--critical',
      panelClass: 'incident-panel--critical',
    }
  }

  if (label === 'Silent') {
    return {
      itemClass: 'finding-item--silent',
      chipClass: 'severity-chip--silent',
      panelClass: 'incident-panel--silent',
    }
  }

  if (label === 'Strong') {
    return {
      itemClass: 'finding-item--strong',
      chipClass: 'severity-chip--strong',
      panelClass: 'incident-panel--strong',
    }
  }

  return {
    itemClass: 'finding-item--neutral',
    chipClass: 'severity-chip--neutral',
    panelClass: '',
  }
}

const scoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-300'
  if (score >= 60) return 'text-amber-300'
  if (score >= 40) return 'text-orange-300'
  return 'text-red-400'
}

const getRepairFirst = (report: AuditReport) =>
  report.gemini?.priorities.length
    ? report.gemini.priorities
    : report.checks
        .filter((check) => check.status !== 'pass')
        .slice(0, 4)
        .map((check) => check.recommendation)

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
  const findings = report.checks
    .map(
      (check) =>
        `<li><strong>${check.name}</strong> - ${check.status.toUpperCase()}<br/>${check.summary}<br/><em>${check.recommendation}</em></li>`,
    )
    .join('')
  const repairFirst = getRepairFirst(report)
    .map((priority) => `<li>${priority}</li>`)
    .join('')
  const whyThisMatters = report.gemini?.whyThisMatters ?? ''
  const summary = report.gemini?.summary ?? ''
  const summarySection = summary ? `<h2>Summary</h2><p>${summary}</p>` : ''
  const whyThisMattersSection = whyThisMatters
    ? `<h2>Why This Matters</h2><p>${whyThisMatters}</p>`
    : ''
  const html = `<!doctype html><html><head><meta charset="UTF-8"/><title>BlackoutBench Report</title><style>body{font-family:Arial,sans-serif;background:#111;color:#eee;padding:24px}h1,h2{margin-bottom:8px}.metric{margin:6px 0}li{margin:8px 0}</style></head><body><h1>BlackoutBench Report</h1><p><strong>Target:</strong> ${report.url}</p><p class="metric"><strong>Survivability Score:</strong> ${report.score}</p><p class="metric"><strong>Verdict:</strong> ${report.verdict}</p><p class="metric"><strong>Critical Failures:</strong> ${report.criticalFailures}</p><p class="metric"><strong>Silent Failures:</strong> ${report.silentFailures}</p>${summarySection}<h2>Findings</h2><ul>${findings}</ul><h2>Repair First</h2><ol>${repairFirst}</ol>${whyThisMattersSection}</body></html>`
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
  const [previewReport, setPreviewReport] = useState<AuditReport>()
  const [selectedFinding, setSelectedFinding] = useState(0)
  const [error, setError] = useState<string>()

  const report = progress?.report ?? previewReport
  const repairFirst = report ? getRepairFirst(report) : []
  let statusMessage = 'Paste a URL and run the bench.'

  if (previewReport) {
    statusMessage = 'Loaded canonical sample report for screenshots, README excerpts, and demo framing.'
  }

  if (progress?.status === 'done') {
    statusMessage = 'Audit complete.'
  }

  if (progress?.status === 'running') {
    statusMessage = `Current check: ${progress.currentCheck ?? 'initializing'}`
  }

  const scrollToBenchControl = () => {
    globalThis.document.getElementById('bench-control')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const scrollToResult = () => {
    globalThis.setTimeout(() => {
      globalThis.document.getElementById('report-output')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 50)
  }

  const runBench = async () => {
    setError(undefined)
    setProgress(undefined)
    setPreviewReport(undefined)
    setAuditId(undefined)
    setSelectedFinding(0)
    scrollToBenchControl()

    const res = await fetch(apiUrl('/api/audits'), {
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

  const showSampleReport = () => {
    setError(undefined)
    setAuditId(undefined)
    setProgress(undefined)
    setPreviewReport(sampleReport)
    setSelectedFinding(0)
    scrollToResult()
  }

  useEffect(() => {
    if (!auditId) return

    const timer = globalThis.setInterval(async () => {
      const res = await fetch(apiUrl(`/api/audits/${auditId}`))
      if (!res.ok) return
      const data = (await res.json()) as AuditProgress
      setProgress(data)
      if (data.status === 'done' || data.status === 'error') {
        globalThis.clearInterval(timer)
      }
    }, 1200)

    return () => globalThis.clearInterval(timer)
  }, [auditId])

  return (
    <main className="inspection-shell mx-auto min-h-screen w-full max-w-6xl p-6 text-slate-200 md:p-10">
      <section className="panel panel-rule p-6 md:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-400/90">
          Planetary stress harness
        </p>
        <div className="mt-3 grid gap-8 md:grid-cols-[1.35fr_0.85fr] md:items-end">
          <div>
            <h1 className="max-w-3xl text-5xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-slate-50 md:text-7xl">
              Does your app survive the real planet?
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
              Run a planetary stress audit against any web app and uncover what breaks under
              offline mode, weak signal, interrupted actions, and fragile infrastructure.
            </p>
          </div>
          <div className="panel p-4 md:p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Support line</p>
            <p className="doctrine-strip mt-3 text-sm leading-6 text-slate-200">
              Most apps assume stability. BlackoutBench tests what survives when that
              assumption fails.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <button
            onClick={scrollToBenchControl}
            className="control-button control-button--primary px-5 py-3 font-semibold"
          >
            Run a Bench
          </button>
          <button
            onClick={showSampleReport}
            className="control-button control-button--secondary px-5 py-3 font-semibold"
          >
            See Sample Report
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-2 md:grid-cols-5">
        {proofStrip.map((item, index) => (
          <div
            key={item}
            className="proof-cell px-3 py-3 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300"
          >
            <span className="proof-marker mr-2">0{index + 1}</span>
            {item}
          </div>
        ))}
      </section>

      <section id="bench-control" className="panel panel-rule mt-6 p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
              Bench control
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-slate-100 md:text-4xl">
              Run the test. Keep the verdict close.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Most apps assume stability. BlackoutBench tests what survives when that assumption fails.
            </p>
          </div>
          <div className="panel p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Current status
            </p>
            <p className="mt-3 font-mono text-sm uppercase tracking-[0.14em] text-amber-200">
              {statusMessage}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <input
            className="control-input w-full px-4 py-3 text-sm text-slate-100 outline-none ring-0"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://your-app.example"
          />
          <button
            onClick={runBench}
            className="control-button control-button--primary px-5 py-3 font-semibold"
          >
            Run Bench
          </button>
          <button
            onClick={showSampleReport}
            className="control-button control-button--secondary px-5 py-3 font-semibold"
          >
            Load Sample
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </section>

      {report ? (
        <section id="report-output" className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div className="panel panel-critical panel-document p-6">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-red-300">
              Inspection outcome
            </p>
            <p className="mt-3 text-sm uppercase tracking-[0.2em] text-slate-500">
              Survivability Score
            </p>
            <p className={`result-score mt-3 text-8xl font-black ${scoreColor(report.score)}`}>
              {report.score}
            </p>
            <div className="mt-3">
              <span className="status-badge">{report.verdict}</span>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
              {report.gemini?.summary ??
                'The point is not the number by itself. The point is the failure pattern: what broke, what failed silently, what remained usable, and what should be repaired first.'}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="metric-box metric-box--critical p-3">
                <p className="text-slate-400">Critical failures</p>
                <p className="mt-1 text-2xl text-red-300">{report.criticalFailures}</p>
              </div>
              <div className="metric-box metric-box--warning p-3">
                <p className="text-slate-400">Silent failures</p>
                <p className="mt-1 text-2xl text-amber-300">{report.silentFailures}</p>
              </div>
              <div className="metric-box metric-box--neutral p-3">
                <p className="text-slate-400">Essential utility</p>
                <p className="mt-1 text-lg text-slate-100">
                  {report.essentialActionSurvival ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="metric-box metric-box--neutral p-3">
                <p className="text-slate-400">Recovery</p>
                <p className="mt-1 text-lg text-slate-100">{report.subscores.recovery}/100</p>
              </div>
            </div>

            <div className="incident-panel incident-panel--strong mt-5 p-4">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-amber-300">
                Repair First
              </h3>
              <ol className="mt-3 space-y-2 text-sm text-slate-300">
                {repairFirst.map((priority, index) => (
                  <li key={`${priority}-${index}`}>{index + 1}. {priority}</li>
                ))}
              </ol>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => exportJson(report)}
                className="control-button control-button--secondary px-4 py-2 text-sm"
              >
                Export JSON
              </button>
              <button
                onClick={() => exportPrintable(report)}
                className="control-button control-button--secondary px-4 py-2 text-sm"
              >
                Export HTML report
              </button>
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
              Failure pattern
            </h3>
            <ul className="mt-3 space-y-2">
              {report.checks.map((check, index) => (
                <li key={check.id}>
                  {(() => {
                    const tone = getFindingTone(check.label)

                    return (
                      <button
                        onClick={() => setSelectedFinding(index)}
                        className={`finding-item ${tone.itemClass} w-full px-3 py-3 text-left text-sm ${
                          index === selectedFinding
                            ? 'border-amber-500 bg-[#1a1510] text-amber-100'
                            : 'border-slate-800 bg-black/40 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className={`severity-chip ${tone.chipClass}`}>{check.label}</span>
                          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            {check.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.05em] text-slate-100">
                          {check.name}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{check.summary}</p>
                      </button>
                    )
                  })()}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {report?.checks[selectedFinding] ? (
        <section className={`incident-panel ${getFindingTone(report.checks[selectedFinding].label).panelClass} mt-6 p-6`}>
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">Finding detail</h3>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={`severity-chip ${getFindingTone(report.checks[selectedFinding].label).chipClass}`}>
              {report.checks[selectedFinding].label}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
              {report.checks[selectedFinding].status}
            </span>
          </div>
          <h4 className="mt-2 text-xl text-slate-100">{report.checks[selectedFinding].name}</h4>
          <p className="mt-2 text-slate-300">{report.checks[selectedFinding].summary}</p>
          <p className="mt-3 text-sm text-slate-400">Evidence: {report.checks[selectedFinding].evidence}</p>
          <p className="mt-2 text-sm text-amber-200">
            Repair priority: {report.checks[selectedFinding].recommendation}
          </p>
        </section>
      ) : null}

      {report?.gemini ? (
        <section className="panel mt-6 p-6">
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-indigo-300">Gemini guidance</h3>
          <p className="mt-2 text-slate-200">{report.gemini.summary}</p>
          <ul className="mt-3 list-disc pl-5 text-slate-300">
            {report.gemini.priorities.map((priority) => (
              <li key={priority}>{priority}</li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
            Why this matters
          </p>
          <p className="mt-2 text-sm text-slate-400">{report.gemini.whyThisMatters}</p>
        </section>
      ) : null}

      <section className="panel mt-6 p-6 md:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">Why this exists</p>
        <h2 className="mt-3 max-w-4xl text-3xl font-semibold text-slate-100 md:text-4xl">
          Most software is built for conditions it does not control.
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-[0.95fr_1.05fr]">
          <div className="panel p-5 font-mono text-sm uppercase tracking-[0.16em] text-slate-300">
            <p>Stable signal.</p>
            <p className="mt-2">Stable power.</p>
            <p className="mt-2">Unbroken attention.</p>
            <p className="mt-2">Clean reloads.</p>
            <p className="mt-2">Predictable recovery.</p>
          </div>
          <div className="space-y-4 text-base leading-7 text-slate-300">
            <p>Real life does not guarantee any of that.</p>
            <p>
              BlackoutBench exists to reveal what remains useful after those assumptions
              start collapsing. It does not reward polish. It inspects survivability.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
        <div className="panel p-6 md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">How it works</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold text-slate-100 md:text-4xl">
            Run the bench. Read the damage. Repair what matters first.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {processSteps.map((step) => (
              <div key={step.title} className="panel p-5">
                <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-amber-300">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-6 md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
            Live audit console
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-300">{statusMessage}</p>

          <ul className="mt-5 max-h-72 space-y-2 overflow-auto pr-2 font-mono text-xs text-slate-300">
            {(progress?.events ??
              (previewReport
                ? [
                    'Sample verdict loaded.',
                    'Essential utility collapse highlighted.',
                    'Draft loss exposed.',
                    'Silent retry failure documented.',
                    'Gemini repair synthesis attached.',
                  ]
                : proofStrip)).map((event, index) => (
              <li key={`${event}-${index}`} className="proof-cell p-3">
                {event}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel panel-rule mt-6 p-6 md:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">Result language</p>
        <h2 className="mt-3 max-w-4xl text-3xl font-semibold text-slate-100 md:text-4xl">
          A failed inspection is better than a silent lie.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          BlackoutBench is designed to surface failure in language that actually means
          something under pressure.
        </p>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-amber-300">
          Most apps assume stability. BlackoutBench tests what survives when that assumption
          fails.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-5">
          <div className="metric-box metric-box--neutral p-4">
            <p className="text-sm text-slate-400">Survivability Score</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">0-100</p>
          </div>
          <div className="metric-box metric-box--critical p-4">
            <p className="text-sm text-slate-400">Critical Failures</p>
            <p className="mt-2 text-2xl font-semibold text-red-300">Counted</p>
          </div>
          <div className="metric-box metric-box--warning p-4">
            <p className="text-sm text-slate-400">Silent Failures</p>
            <p className="mt-2 text-2xl font-semibold text-amber-300">Exposed</p>
          </div>
          <div className="metric-box metric-box--neutral p-4">
            <p className="text-sm text-slate-400">Essential Utility</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">Scored</p>
          </div>
          <div className="metric-box metric-box--warning p-4">
            <p className="text-sm text-slate-400">Repair First</p>
            <p className="mt-2 text-2xl font-semibold text-amber-200">Prioritized</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {verdictBands.map((band) => (
            <div
              key={band}
              className="status-badge"
            >
              {band}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
        <div className="panel p-6 md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
            Sample report preview
          </p>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold text-slate-100 md:text-4xl">
            See what fragility looks like.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            A weak result should not hide behind polite wording. It should tell you what
            broke, what failed silently, what remained usable, and what should be repaired
            first.
          </p>

          <div className="panel panel-document panel-critical mt-6 p-5">
            <div className="grid gap-3 border-b border-[rgba(255,255,255,0.08)] pb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500 md:grid-cols-2">
              <div>
                <p className="text-slate-400">Target</p>
                <p className="mt-1 break-all text-slate-200">{sampleReport.url}</p>
              </div>
              <div>
                <p className="text-slate-400">Audit ID</p>
                <p className="mt-1 text-slate-200">{sampleReport.id}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-red-300">
                  Canonical sample
                </p>
                <p className={`result-score mt-3 text-7xl font-black ${scoreColor(sampleReport.score)}`}>
                  {sampleReport.score}
                </p>
                <div className="mt-3">
                  <span className="status-badge">{sampleReport.verdict}</span>
                </div>
              </div>
              <button
                onClick={showSampleReport}
                className="control-button control-button--secondary px-4 py-2 text-sm font-semibold"
              >
                Read the Sample Report
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-300">{sampleReport.gemini?.summary}</p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="metric-box metric-box--critical p-4">
                <p className="text-sm text-slate-400">Critical Failures</p>
                <p className="mt-2 text-2xl text-red-300">{sampleReport.criticalFailures}</p>
              </div>
              <div className="metric-box metric-box--warning p-4">
                <p className="text-sm text-slate-400">Silent Failures</p>
                <p className="mt-2 text-2xl text-amber-300">{sampleReport.silentFailures}</p>
              </div>
              <div className="metric-box metric-box--neutral p-4">
                <p className="text-sm text-slate-400">Essential Utility</p>
                <p className="mt-2 text-2xl text-slate-100">
                  {sampleReport.essentialActionSurvival ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="panel p-6 md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
            Failure snapshot
          </p>
          <ul className="report-list mt-5 space-y-3">
            <li className="incident-panel incident-panel--critical p-4">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-red-300">
                Critical failures
              </p>
              <ul className="report-list mt-3 space-y-2 text-sm leading-6 text-slate-300">
                <li>essential task collapses after connectivity drops</li>
                <li>draft state is lost on refresh</li>
                <li>export depends on full application recovery</li>
              </ul>
            </li>
            <li className="incident-panel incident-panel--silent p-4">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-300">
                Silent failures
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                retry suggests recovery without restoring real utility
              </p>
            </li>
            <li className="incident-panel incident-panel--strong p-4">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-200">
                Repair First
              </p>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                <li>1. preserve primary task state locally before network confirmation</li>
                <li>2. surface degraded-mode messaging immediately</li>
                <li>3. decouple export from full readiness</li>
              </ol>
            </li>
          </ul>
        </div>
      </section>

      <section className="panel mt-6 p-6 md:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-indigo-300">Gemini note</p>
        <h2 className="mt-3 max-w-4xl text-3xl font-semibold text-slate-100 md:text-4xl">
          Repair guidance, not AI theater.
        </h2>
        <p className="mt-4 max-w-4xl text-base leading-7 text-slate-300">
          BlackoutBench uses Gemini to synthesize repair direction from real audit findings.
          The checks produce the verdict. Gemini helps compress what to fix first and why
          the weakness matters under interruption, degraded connectivity, or broken
          continuity.
        </p>
      </section>

      <section className="panel panel-critical panel-rule mt-6 p-6 md:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-red-300">
          Closing thesis
        </p>
        <h2 className="mt-3 max-w-4xl text-3xl font-semibold text-slate-100 md:text-5xl">
          The planet does not care about your happy path.
        </h2>
        <p className="mt-4 max-w-4xl text-base leading-7 text-slate-300">
          If your app only works when the environment behaves, then the environment is doing
          part of the product work for you.
        </p>
        <p className="mt-4 max-w-4xl text-base leading-7 text-slate-300">
          BlackoutBench measures what survives after the happy path is gone.
        </p>
        <p className="mt-5 font-mono text-xs uppercase tracking-[0.2em] text-amber-300">
          Most apps assume stability. BlackoutBench tests what survives when that assumption
          fails.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={runBench}
            className="control-button control-button--primary px-5 py-3 font-semibold"
          >
            Run a Bench
          </button>
          <button
            onClick={showSampleReport}
            className="control-button control-button--secondary px-5 py-3 font-semibold"
          >
            Read the Sample Report
          </button>
        </div>
      </section>
    </main>
  )
}

export default App
