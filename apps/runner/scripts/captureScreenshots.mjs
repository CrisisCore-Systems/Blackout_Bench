import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const rootDir = path.resolve(process.cwd(), '..', '..')
const outputDir = path.join(rootDir, 'docs', 'screenshots')
const baseUrl = 'http://localhost:5173'
const viewport = { width: 1440, height: 1600 }

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const clipToPng = async (page, fileName, clip) => {
  await page.screenshot({
    path: path.join(outputDir, fileName),
    clip,
  })
}

const main = async () => {
  await mkdir(outputDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1.5 })

  try {
    const page = await context.newPage()
    await page.goto(baseUrl, { waitUntil: 'networkidle' })

    await clipToPng(page, 'hero-shot.png', {
      x: 0,
      y: 0,
      width: viewport.width,
      height: 860,
    })

    const sections = page.locator('main > section')
    await sections.nth(5).scrollIntoViewIfNeeded()
    await wait(250)
    await sections.nth(5).screenshot({ path: path.join(outputDir, 'sample-report-shot.png') })

    await page.getByRole('button', { name: 'See Sample Report' }).first().click()
    await page.getByText('Inspection outcome').waitFor({ state: 'visible' })
    const resultSection = page
      .getByText('Inspection outcome')
      .locator('xpath=ancestor::section[1]')
    await resultSection.scrollIntoViewIfNeeded()
    await wait(250)
    await resultSection.screenshot({ path: path.join(outputDir, 'result-screen-shot.png') })

    const runningPage = await context.newPage()
    await runningPage.goto(baseUrl, { waitUntil: 'networkidle' })
    await runningPage.getByPlaceholder('https://your-app.example').fill('https://example.com')
    await runningPage.getByRole('button', { name: 'Run Bench' }).click()

    try {
      await runningPage.getByText(/Current check:/).waitFor({ timeout: 12000 })
      await wait(500)
      const runningSections = runningPage.locator('main > section')
      await runningSections.nth(3).scrollIntoViewIfNeeded()
      await wait(200)
      await runningSections.nth(3).screenshot({ path: path.join(outputDir, 'audit-in-progress-shot.png') })
    } catch {
      // Skip if the audit resolves too fast to capture a clean in-progress state.
    }

    await runningPage.close()
  } finally {
    await context.close()
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})