import type {
  AuditCheckResult,
  GeminiGuidance,
  GeminiStatus,
} from '../../../../packages/shared/src/types.js'

const logGeminiIssue = (message: string) => {
  console.warn(`[BlackoutBench][Gemini] ${message}`)
}

interface GeminiSynthesisResult {
  status: GeminiStatus
  guidance?: GeminiGuidance
}

interface GeminiErrorPayload {
  error?: {
    code?: number
    status?: string
    message?: string
  }
}

const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com'
const DEFAULT_GEMINI_API_VERSION = 'v1beta'
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '')
const stripLeadingAndTrailingSlashes = (value: string) => value.replaceAll(/^\/+|\/+$/g, '')
const normalizeModelName = (value: string) => value.replace(/^models\//i, '')

const parseGuidance = (text: string): GeminiSynthesisResult => {
  const jsonMatch = /\{[\s\S]*\}/.exec(text)
  if (!jsonMatch) {
    logGeminiIssue('response did not contain JSON')
    return { status: 'invalid_json' }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as GeminiGuidance
    if (
      !parsed.summary ||
      !Array.isArray(parsed.priorities) ||
      !parsed.priorities.every((priority) => typeof priority === 'string') ||
      !parsed.whyThisMatters
    ) {
      logGeminiIssue('response JSON did not match expected shape')
      return { status: 'invalid_shape' }
    }

    return {
      status: 'attached',
      guidance: {
        summary: parsed.summary,
        priorities: parsed.priorities.slice(0, 3),
        whyThisMatters: parsed.whyThisMatters,
      },
    }
  } catch (error: unknown) {
    logGeminiIssue(
      error instanceof Error ? `failed to parse JSON: ${error.message}` : 'failed to parse JSON',
    )
    return { status: 'invalid_json' }
  }
}

const logUpstreamFailure = async (
  response: Response,
  requestTarget: string,
  rawModel: string,
  model: string,
) => {
  const errorPayload = (await response.json().catch(() => undefined)) as GeminiErrorPayload | undefined
  const errorMessage = errorPayload?.error?.message?.trim()

  logGeminiIssue(
    [
      `upstream returned ${response.status}${response.status === 404 ? ' NOT_FOUND' : ''}`,
      `target ${requestTarget}`,
      `raw model ${rawModel}`,
      rawModel === model ? undefined : `normalized model ${model}`,
      errorMessage,
    ]
      .filter(Boolean)
      .join(' | '),
  )
}

export const summarizeWithGemini = async (
  checks: AuditCheckResult[],
): Promise<GeminiSynthesisResult> => {
  const apiKey = process.env.GEMINI_API_KEY
  const rawModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL
  const model = normalizeModelName(rawModel)
  const apiVersion = stripLeadingAndTrailingSlashes(
    process.env.GEMINI_API_VERSION?.trim() || DEFAULT_GEMINI_API_VERSION,
  )
  const baseUrl = stripTrailingSlashes(
    process.env.GEMINI_BASE_URL?.trim() || DEFAULT_GEMINI_BASE_URL,
  )
  const requestUrl = `${baseUrl}/${apiVersion}/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`
  const requestTarget = `${baseUrl}/${apiVersion}/models/${model}:generateContent`

  if (!apiKey) {
    return { status: 'missing_api_key' }
  }

  const failedChecks = checks.filter((check) => check.status !== 'pass')

  if (!failedChecks.length) {
    return { status: 'no_actionable_failures' }
  }

  const prompt = {
    failures: failedChecks,
    request:
      'Return strict JSON with keys summary (string), priorities (array of up to 3 strings), whyThisMatters (string). Write in BlackoutBench voice: concrete, unsentimental, and specific about lost control, broken continuity, or unsafe completion. Avoid generic phrases like user experience, reliability, or important to fix. Do not wrap in markdown fences.',
  }

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(prompt) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  }).catch((error: unknown) => {
    logGeminiIssue(
      error instanceof Error ? `request failed: ${error.message}` : 'request failed',
    )
    return undefined
  })

  if (!response) {
    return { status: 'request_failed' }
  }

  if (!response.ok) {
    await logUpstreamFailure(response, requestTarget, rawModel, model)
    return { status: response.status === 404 ? 'resource_not_found' : 'upstream_failed' }
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    logGeminiIssue('response did not include text content')
    return { status: 'missing_text' }
  }

  return parseGuidance(text)
}
