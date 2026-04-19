import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..', '..', '..')
const outputDir = path.join(rootDir, 'docs', 'screenshots')
const baseUrl = (process.env.CAPTURE_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const targetUrl = process.env.CAPTURE_TARGET_URL ?? 'https://paintracker.ca'
const webmPath = path.join(outputDir, 'demo-run.webm')
const gifPath = path.join(outputDir, 'demo-run.gif')

const convertToGif = () => {
  const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' })

  if (probe.status !== 0) {
    console.warn('ffmpeg not found. Kept demo-run.webm only.')
    return
  }

  const conversion = spawnSync(
    'ffmpeg',
    ['-y', '-i', webmPath, '-vf', 'fps=10,scale=960:-1:flags=lanczos', gifPath],
    { stdio: 'inherit' },
  )

  if (conversion.status !== 0) {
    console.warn('ffmpeg conversion failed. Kept demo-run.webm only.')
  }
}

const main = async () => {
  await mkdir(outputDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    recordVideo: { dir: outputDir, size: { width: 1440, height: 1080 } },
  })
  const page = await context.newPage()
  const video = page.video()

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    await page.locator('#bench-control').scrollIntoViewIfNeeded()
    await page.getByPlaceholder('https://your-app.example').fill(targetUrl)
    await page.getByRole('button', { name: 'Run Bench' }).click()
    await page.getByText('Inspection outcome').waitFor({ state: 'visible', timeout: 120000 })
    await page.waitForTimeout(1500)
  } finally {
    await page.close()

    if (video) {
      await video.saveAs(webmPath)
    }

    await context.close()
    await browser.close()

    if (video) {
      convertToGif()
    }
  }
}

try {
  await main()
} catch (error) {
  console.error(error)
  process.exitCode = 1
}