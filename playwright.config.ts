import { defineConfig } from '@playwright/test';

// E2E / visual / motion tests run against the PRODUCTION build (vite preview) in the locally
// installed Google Chrome with GPU rasterisation — no browser download, no external service.
const NODE = process.execPath.split(String.fromCharCode(92)).join('/');
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.03, animations: 'disabled' } },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'project_artifacts/evidence/e2e-results.json' }]],
  snapshotPathTemplate: 'tests/e2e/__screenshots__/{arg}{ext}',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1366, height: 768 },
    timezoneId: 'Asia/Baghdad',
    launchOptions: { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--js-flags=--expose-gc'] },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `"${NODE}" node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort`,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
