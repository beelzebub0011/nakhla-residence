// Run the Blender that is ALREADY installed on this PC (never downloads or installs anything).
// Usage: node tools/blender.mjs <script.py> [args after --]
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function find() {
  if (process.env.BLENDER && existsSync(process.env.BLENDER)) return process.env.BLENDER;
  for (const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean)) {
    const dir = join(base, 'Blender Foundation');
    if (!existsSync(dir)) continue;
    const versions = readdirSync(dir).filter((d) => existsSync(join(dir, d, 'blender.exe'))).sort().reverse();
    if (versions.length) return join(dir, versions[0], 'blender.exe');
  }
  return 'blender';
}
const [script, ...rest] = process.argv.slice(2);
if (!script) { console.error('usage: node tools/blender.mjs <script.py> [args]'); process.exit(2); }
const exe = find();
console.log('[blender]', exe);
const r = spawnSync(exe, ['-b', '--python', script, '--', ...rest], { stdio: 'inherit' });
process.exit(r.status ?? 1);
