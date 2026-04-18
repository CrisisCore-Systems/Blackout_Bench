import type { AuditCheckResult, GeminiGuidance } from '../../../../packages/shared/src/types.js'

const logGeminiIssue = (message: string) => {
  console.warn(`[BlackoutBench][Gemini] ${message}`)
}

export const summarizeWithGemini = async (
  checks: AuditCheckResult[],
): Promise<GeminiGuidance | undefined> => {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return undefined
  }

  const failedChecks = checks.filter((check) => check.status !== 'pass')

  if (!failedChecks.length) {
    return undefined
  }

  const prompt = {
    failures: failedChecks,
    request:
      'Return strict JSON with keys summary (string), priorities (array of up to 3 strings), whyThisMatters (string). Do not wrap in markdown fences.',
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(prompt) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    },
  ).catch((error: unknown) => {
    logGeminiIssue(
      error instanceof Error ? `request failed: ${error.message}` : 'request failed',
    )
    return undefined
  })

  if (!response?.ok) {
    logGeminiIssue(`upstream returned ${response?.status ?? 'no response'}`)
    return undefined
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    logGeminiIssue('response did not include text content')
    return undefined
  }

  const jsonMatch = /\{[\s\S]*\}/.exec(text)
  if (!jsonMatch) {
    logGeminiIssue('response did not contain JSON')
    return undefined
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
      return undefined
    }
    return {
      summary: parsed.summary,
      priorities: parsed.priorities.slice(0, 3),
      whyThisMatters: parsed.whyThisMatters,
    }
  } catch (error: unknown) {
    logGeminiIssue(
      error instanceof Error ? `failed to parse JSON: ${error.message}` : 'failed to parse JSON',
    )
    return undefined
  }
}
