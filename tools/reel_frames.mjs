// Private study frames from the owner-supplied Instagram reels (V11 S01 / S22). Frames are for local evaluation only:
// they are written to references/private_frames (git-ignored) and must never be published or shipped with the site.
// Usage: node tools/reel_frames.mjs   → references/private_frames/REFxx_tNN.N.jpg + references/reel_probe.json
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const REELS = [
  ['REF01', 'https://www.instagram.com/reel/DfhMrbfRHII/'],
  ['REF02', 'https://www.instagram.com/reel/DfC25-KtwRq/'],
  ['REF03', 'https://www.instagram.com/reel/DfnzK78z4Su/'],
  ['REF04', 'https://www.instagram.com/reel/DfEZ6FJh5vK/'],
  ['REF05', 'https://www.instagram.com/reel/DfVuYdwocul/'],
  ['REF06', 'https://www.instagram.com/reel/DfhqbXuJItz/'],
  ['REF07', 'https://www.instagram.com/reel/DfHFGsLlSo6/'],
];
const only = (process.argv[2] ?? '').split(',').filter(Boolean);
const step = Number(process.argv[3] ?? 1.5);
const out = 'references/private_frames'; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const probe = [];
for (const [id, url] of REELS) {
  if (only.length && !only.includes(id)) continue;
  const ctx = await browser.newContext({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1, locale: 'en-US',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36' });
  const page = await ctx.newPage();
  const rec = { id, url, accessible: false };
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('video', { timeout: 25000 });
    await page.waitForTimeout(1500);
    const meta = await page.evaluate(async () => {
      document.querySelectorAll('[role=dialog]').forEach((d) => d.remove());
      const v = document.querySelector('video'); v.muted = true;
      const bg = document.createElement('div'); bg.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483646'; document.body.appendChild(bg);
      v.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;z-index:2147483647;background:#000'; document.body.appendChild(v);
      await v.play().catch(() => 0); await new Promise((r) => setTimeout(r, 1500));
      return { duration: v.duration, w: v.videoWidth, h: v.videoHeight, desc: document.querySelector('meta[property="og:description"]')?.content ?? '' };
    });
    Object.assign(rec, meta, { accessible: true, retrieved: new Date().toISOString(), frames: [] });
    for (let t = 0.4; t < meta.duration - 0.1; t += step) {
      await page.evaluate(async (t) => { const v = document.querySelector('video'); v.pause(); v.currentTime = t;
        await Promise.race([new Promise((r) => v.addEventListener('seeked', r, { once: true })), new Promise((r) => setTimeout(r, 5000))]);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }, t);
      await page.waitForTimeout(150);
      const f = `${out}/${id}_t${t.toFixed(1).padStart(4, '0')}.jpg`; await page.screenshot({ path: f, quality: 82, type: 'jpeg' }); rec.frames.push(f);
    }
    console.log(id, 'ok', meta.duration.toFixed(1), 's', rec.frames.length, 'frames');
  } catch (e) { rec.error = String(e).slice(0, 200); console.log(id, 'FAILED', rec.error); }
  probe.push(rec); await ctx.close();
}
await browser.close();
writeFileSync('references/reel_probe.json', JSON.stringify(probe, null, 1));
