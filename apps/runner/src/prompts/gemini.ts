import type { AuditCheckResult, GeminiGuidance } from '../../../../packages/shared/src/types.js'

export const summarizeWithGemini = async (
  checks: AuditCheckResult[],
): Promise<GeminiGuidance | undefined> => {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return undefined
  }

  const failedChecks = checks.filter((check) => check.status !== 'pass')

  const prompt = {
    failures: failedChecks,
    request:
      'Return JSON with keys summary (string), priorities (array of 3 strings), whyThisMatters (string).',
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(prompt) }] }],
      }),
    },
  ).catch(() => undefined)

  if (!response?.ok) {
    return undefined
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    return undefined
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return undefined
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as GeminiGuidance
    if (!parsed.summary || !Array.isArray(parsed.priorities) || !parsed.whyThisMatters) {
      return undefined
    }
    return {
      summary: parsed.summary,
      priorities: parsed.priorities.slice(0, 3),
      whyThisMatters: parsed.whyThisMatters,
    }
  } catch {
    return undefined
  }
}
