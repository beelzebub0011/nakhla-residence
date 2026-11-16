import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { engineRef } from './Stage';
import { perfToCsv, runSlice } from '../state/benchmark';

// DEV-ONLY motion HUD (?hud=1). English only, never shown to visitors, sends nothing anywhere.
type Perf = ReturnType<NonNullable<typeof engineRef.current>['perf']>;

function download(name: string, text: string, type: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function Hud() {
  const [p, setP] = useState<Perf | null>(null); const [inputMs, setInputMs] = useState(0); const [busy, setBusy] = useState(false);
  const spark = useRef<HTMLCanvasElement>(null); const tier = useStore((s) => s.tier);
  useEffect(() => {
    const id = window.setInterval(() => { const e = engineRef.current; if (e) setP(e.perf()); }, 500);
    const onDown = () => { const t0 = performance.now(); requestAnimationFrame(() => setInputMs(+(performance.now() - t0).toFixed(1))); };
    window.addEventListener('pointerdown', onDown, true);
    (window as unknown as { __nakhlaBench: unknown }).__nakhlaBench = { runSlice: (n = 1) => (engineRef.current ? runSlice(engineRef.current, n) : null) };
    return () => { window.clearInterval(id); window.removeEventListener('pointerdown', onDown, true); };
  }, []);
  useEffect(() => {
    const c = spark.current; const e = engineRef.current; if (!c || !e) return; const g = c.getContext('2d')!; const w = (c.width = 280), h = (c.height = 44);
    const frames = (e as unknown as { frameLog: number[] }).frameLog.slice(-140); g.clearRect(0, 0, w, h);
    g.strokeStyle = '#3d5a45'; g.beginPath(); g.moveTo(0, h - 16.7); g.lineTo(w, h - 16.7); g.stroke();
    g.strokeStyle = '#7a4a3a'; g.beginPath(); g.moveTo(0, h - 33.3); g.lineTo(w, h - 33.3); g.stroke();
    frames.forEach((f, i) => { g.fillStyle = f > 50 ? '#ff6b5e' : f > 20 ? '#ffd166' : '#8be29b'; g.fillRect(i * 2, h - Math.min(h, f), 2, Math.min(h, f)); });
  }, [p]);
  if (!p) return null;
  const meta = { tier, browser: navigator.userAgent, notes: `dpr ${p.dpr}; ${innerWidth}x${innerHeight}` };
  const bench = async () => { const e = engineRef.current; if (!e || busy) return; setBusy(true); const r = await runSlice(e, 3); setP(r); setBusy(false); };
  return (
    <div className="devhud" data-testid="devhud">
      <div>MOTION HUD · tier {tier} · phase {p.phase} · dpr {p.dpr}</div>
      <canvas ref={spark} />
      <div>frame ms p50 {p.frames.p50} · p95 {p.frames.p95} · p99 {p.frames.p99} · max {p.frames.max} · &gt;50ms {p.frames.hitches50}</div>
      <div>fps~{p.frames.fpsMedian} · input→frame {inputMs} ms · calls {p.calls} · tris {Math.round(p.triangles / 1000)}k</div>
      <div>geo {p.geometries} · tex {p.textures} · programs {p.programs} · trips {p.stats.tripsCompleted}/{p.stats.tripsStarted} · retarget {p.stats.retargets}</div>
      {p.transitions.slice(-5).map((t, i) => <div key={i}>{t.id.slice(0, 22).padEnd(22)} {String(t.durationMs).padStart(5)}ms p95 {t.p95} h{t.hitches50}{t.interrupted ? ' ⟲' : ''}</div>)}
      <div>
        <button type="button" onClick={bench} disabled={busy}>{busy ? 'running…' : 'run slice ×3'}</button>
        <button type="button" onClick={() => download('nakhla-motion.json', JSON.stringify({ meta, perf: p }, null, 2), 'application/json')}>JSON</button>
        <button type="button" onClick={() => download('nakhla-motion.csv', perfToCsv(p, meta), 'text/csv')}>CSV</button>
        <button type="button" onClick={() => engineRef.current?.clearPerf()}>clear</button>
      </div>
    </div>
  );
}
