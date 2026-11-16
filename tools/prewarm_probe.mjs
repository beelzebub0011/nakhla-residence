// Diagnostic: stage timings of the first (cold) interior preparation. Usage: node tools/prewarm_probe.mjs
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
await page.addInitScript(() => { window.__long = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ entryTypes: ['longtask'] }); } catch {} });
await page.goto('http://127.0.0.1:4173/?e2e=1#/en/explore');
await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true', null, { timeout: 30000 });
// all times are milliseconds since navigation start (performance.now), so head starts are visible
const t = await page.evaluate(async () => { const e = window.__nakhla.engine; const readyAt = Math.round(performance.now()); await e.prewarm('F04', true); return { readyAt, worker: e.workerDiagnostics, longTasks: window.__long, interiorFullyWarmAt: Math.round(performance.now()), stagesAfterPrewarmCall: e.prewarmLog.filter((x) => x.key === 'residential').map((x) => `${x.stage} +${x.ms}`) }; });
console.log(JSON.stringify(t));
await browser.close();
