import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:2631';
const legacyPath = resolve(process.env.LOCAL_GAMES_FILE || 'tests/fixtures/games.json');
const legacyBefore = await readFile(legacyPath, 'utf-8');
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const browser = await chromium.launch({ headless: true, executablePath });

try {
  const page = await browser.newPage();
  const sinkRequests = [];
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => pageErrors.push(`request failed: ${request.url()} ${request.failure()?.errorText}`));
  page.on('response', (response) => {
    if (response.status() >= 400) pageErrors.push(`response ${response.status()}: ${response.url()}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.url().includes('/network-sink')) sinkRequests.push(request.url());
  });

  const topResponse = await page.request.get(baseUrl);
  const shareResponse = await page.request.get(`${baseUrl}/g/security-test`);
  for (const response of [topResponse, shareResponse]) {
    const policy = response.headers()['content-security-policy'] || '';
    if (!policy.includes("frame-src 'none'")) throw new Error(`missing frame policy: ${policy}`);
  }

  let releaseDirections;
  let releaseGeneration;
  let directionCalls = 0;
  await page.route('**/api/games?limit=12', (route) => route.fulfill({ json: { apps: [] } }));
  await page.route('**/api/directions', async (route) => {
    directionCalls += 1;
    await new Promise((resolveRequest) => {
      releaseDirections = () => {
        resolveRequest();
        return route.fulfill({
          json: {
            ok: true,
            usedMock: true,
            directions: [{ id: 'old', label: '古い案', description: '古い入力の結果' }]
          }
        });
      };
    });
  });
  await page.route('**/api/generate', async (route) => {
    await new Promise((resolveRequest) => {
      releaseGeneration = () => {
        resolveRequest();
        return route.fulfill({ json: { ok: true, app: { sharePath: '/g/security-test' } } });
      };
    });
  });

  const galleryRequested = page.waitForRequest((request) => request.url().includes('/api/games?limit=12'));
  await page.goto(baseUrl);
  await galleryRequested;
  const idea = page.getByLabel('作りたいもの');
  await idea.fill('入力A');
  const inputState = await page.locator('button.secondary').evaluate((button) => ({
    disabled: button.disabled,
    idea: document.querySelector('textarea')?.value || ''
  }));
  if (inputState.disabled) {
    throw new Error(`idea input did not enable directions: ${JSON.stringify({ inputState, pageErrors })}`);
  }
  await page.getByRole('button', { name: 'ふくらませる' }).click();
  await page.waitForFunction(() => document.querySelector('button.secondary')?.textContent?.includes('考え中'));
  if (directionCalls !== 1 || !releaseDirections) throw new Error('directions request did not start');

  await idea.fill('入力B');
  await page.getByRole('button', { name: 'そのまま作る' }).click();
  await page.getByRole('button', { name: '実装中...' }).waitFor();
  await releaseDirections();
  await page.waitForTimeout(100);
  if (await page.getByText('古い案').count()) throw new Error('stale direction card returned');
  if (!(await page.getByRole('button', { name: '実装中...' }).isDisabled())) {
    throw new Error('stale response re-enabled generation');
  }
  if (!releaseGeneration) throw new Error('generation request did not start');
  await releaseGeneration();
  await page.waitForURL('**/g/security-test');

  const frame = page.frameLocator('iframe');
  const counter = frame.locator('#counter');
  await counter.click();
  if ((await counter.textContent()) !== '1') throw new Error('sandboxed app interaction stopped working');
  await frame.locator('#navigate').click();
  await page.waitForTimeout(150);
  if (sinkRequests.length !== 0) throw new Error(`generated app escaped to network: ${sinkRequests.join(', ')}`);
  if (page.url() !== `${baseUrl}/g/security-test`) throw new Error(`top page navigated away: ${page.url()}`);

  await page.goto(`${baseUrl}/g/legacy-share`);
  await page.getByText('互換表示中').waitFor();
  const pixel = await page.locator('canvas').evaluate((canvas) => {
    const context = canvas.getContext('2d');
    return context ? Array.from(context.getImageData(12, 12, 1, 1).data) : [];
  });
  if (pixel.length !== 4 || pixel[3] === 0) throw new Error(`legacy canvas did not render: ${pixel}`);

  const legacyAfter = await readFile(legacyPath, 'utf-8');
  if (legacyAfter !== legacyBefore) throw new Error('legacy store was modified');
} finally {
  await browser.close();
}
