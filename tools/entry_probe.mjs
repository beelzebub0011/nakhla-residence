// Diagnostic: which shader programs are compiled during the first floor open / first room entry, and how long the
// longest main-thread tasks are. Usage: node tools/entry_probe.mjs
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} window.__long = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ entryTypes: ['longtask'] }); } catch {} });
await page.goto('http://127.0.0.1:4173/?e2e=1#/en/explore');
await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true', null, { timeout: 30000 });
await page.waitForFunction(() => window.__nakhla.engine.finishesReady === true, null, { timeout: 60000 });
const step = async (label, fn) => page.evaluate(async ([label, fn]) => {
  const { engine, store } = window.__nakhla; const s = store.getState();
  const progs = () => engine.renderer.info.programs.map((p) => p.name + '|' + p.cacheKey.slice(0, 60));
  const before = new Set(progs()); const t0 = performance.now(); window.__long = [];
  new Function('s', fn)(s);
  await new Promise((res) => { const t = () => (engine.director.busy ? requestAnimationFrame(t) : setTimeout(res, 400)); setTimeout(t, 200); });
  const added = progs().filter((p) => !before.has(p));
  return { label, ms: Math.round(performance.now() - t0), newPrograms: added.length, sample: added.slice(0, 12), longTasks: window.__long.filter(([, d]) => d > 50) };
}, [label, fn]);
for (const [label, fn] of [['open F04', "s.selectFloor('F04')"], ['unit', "s.selectUnit('U04A')"], ['room', "s.enterRoom('A.living')"], ['room2', "s.enterRoom('A.kitchen')"]]) console.log(JSON.stringify(await step(label, fn)));
await browser.close();
