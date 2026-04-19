import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..', '..', '..')
const outputDir = path.join(rootDir, 'docs', 'screenshots')
const baseUrl = (process.env.CAPTURE_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const targetUrl = process.env.CAPTURE_TARGET_URL ?? 'https://paintracker.ca'
const viewport = { width: 1440, height: 1600 }

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const clipToPng = async (page, fileName, clip) => {
  await page.screenshot({
    path: path.join(outputDir, fileName),
    clip,
  })
}

const getSection = (page, title) => page.getByText(title).locator('xpath=ancestor::section[1]')

const main = async () => {
  await mkdir(outputDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1.5 })

  try {
    const page = await context.newPage()
    await page.goto(baseUrl, { waitUntil: 'networkidle' })

    const benchControl = page.locator('#bench-control')
    await benchControl.scrollIntoViewIfNeeded()
    await wait(250)
    const benchBounds = await benchControl.boundingBox()

    await clipToPng(page, 'hero-bench-shot.png', {
      x: 0,
      y: 0,
      width: viewport.width,
      height: Math.min(viewport.height, Math.ceil((benchBounds?.y ?? 880) + (benchBounds?.height ?? 320) + 48)),
    })

    const sampleSection = getSection(page, 'Sample report preview')
    await sampleSection.scrollIntoViewIfNeeded()
    await wait(250)
    await sampleSection.screenshot({ path: path.join(outputDir, 'sample-report-shot.png') })

    await page.locator('#bench-control').scrollIntoViewIfNeeded()
    await page.getByPlaceholder('https://your-app.example').fill(targetUrl)
    await page.getByRole('button', { name: 'Run Bench' }).click()

    try {
      await page.getByText(/Using browser endpoint:|Browser connection mode:|Running /).first().waitFor({ timeout: 20000 })
      const consoleSection = getSection(page, 'Live audit console')
      await consoleSection.scrollIntoViewIfNeeded()
      await wait(350)
      await consoleSection.screenshot({ path: path.join(outputDir, 'live-audit-console-shot.png') })
    } catch {
      // Skip if the audit resolves too fast to capture a clean console state.
    }

    await page.getByText('Inspection outcome').waitFor({ state: 'visible', timeout: 120000 })
    const resultSection = getSection(page, 'Inspection outcome')
    await resultSection.scrollIntoViewIfNeeded()
    await wait(350)
    await resultSection.screenshot({ path: path.join(outputDir, 'result-screen-shot.png') })
  } finally {
    await context.close()
    await browser.close()
  }
}

try {
  await main()
} catch (error) {
  console.error(error)
  process.exitCode = 1
}