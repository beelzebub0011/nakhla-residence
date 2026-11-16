import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Owner identity must be exact everywhere it is shown (remediation section 17 / addendum T18.17).
// V11 (owner correction, 2026-11-13): Arabic «راشد عمر محمد» — NOT «رشيد عمر محمد» (the earlier V8 rule was wrong).
// English "Rashid Omar Mohammed" was confirmed by the owner in chat on 2026-11-13. Sorani: «ڕاشید عومەر محەمەد» (needs native review).

const files: string[] = [];
const walk = (dir: string) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx|html|md|css)$/.test(f)) files.push(p); } };
walk('src'); files.push('index.html', 'README.md');

describe('owner identity', () => {
  it('never uses the wrong Arabic spelling', () => {
    for (const f of files) { const t = readFileSync(f, 'utf8'); expect(t.includes('رشيد عمر'), f).toBe(false); expect(t.includes('ڕەشید عومەر'), f).toBe(false); }
  });
  it('shows the exact name, phone and email', () => {
    const all = files.map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(all).toContain('Rashid Omar Mohammed'); expect(all).toContain('راشد عمر محمد'); expect(all).toContain('ڕاشید عومەر محەمەد');
    expect(all).toContain('+9647700864990'); expect(all).toContain('rashid.iq12@gmail.com');
    expect(/Rasheed|Rashed Omar|Rashid Omer/.test(all)).toBe(false);
  });
});
