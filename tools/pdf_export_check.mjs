// Section 17 / T18.17: export the visitor's "My apartment" summary to PDF exactly as the print button would
// (print media), in English and Arabic, for checking with PdfCraft. Usage: node tools/pdf_export_check.mjs [outDir]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? 'project_artifacts/evidence/pdf';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const loc of ['en', 'ar']) {
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch {} });
  await page.goto(`http://127.0.0.1:4173/?e2e=1#/${loc}/explore?f=F04&u=U04A&v=unit`);
  await page.waitForFunction(() => document.querySelector('.stage')?.getAttribute('data-ready') === 'true', null, { timeout: 30000 });
  await page.getByTestId('menu').click(); await page.getByTestId('menu-summary').click(); await page.waitForTimeout(800);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: `${out}/my_apartment_${loc}.pdf`, format: 'A4', printBackground: true });
  console.log('pdf', `${out}/my_apartment_${loc}.pdf`);
}
await browser.close();
