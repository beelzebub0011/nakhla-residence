import { useEffect, useRef, useState } from 'react';

// V12 — one tooltip system for the whole site (owner request: "a small explanation when I hover a button").
// Any element with data-tip, and any icon-only button that has an aria-label, gets a glass tooltip after a short
// hover (pointer) or a long-press (touch). Placement flips above / below to stay on screen. No library.
const DELAY = 420, PRESS = 480;
const tipOf = (el: Element | null): { el: HTMLElement; text: string } | null => {
  for (let e = el as HTMLElement | null; e && e !== document.body; e = e.parentElement) {
    const dt = e.getAttribute?.('data-tip'); if (dt) return { el: e, text: dt };
    if ((e.tagName === 'BUTTON' || e.getAttribute('role') === 'button') && e.getAttribute('aria-label') && !(e.textContent ?? '').trim()) return { el: e, text: e.getAttribute('aria-label')! };
    if (e.tagName === 'BUTTON') return null;
  }
  return null;
};

export function Tooltips() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null);
  const timer = useRef(0); const cur = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const show = (t: { el: HTMLElement; text: string }) => {
      const r = t.el.getBoundingClientRect(); const below = r.top < 64;
      setTip({ text: t.text, x: Math.min(innerWidth - 12, Math.max(12, r.left + r.width / 2)), y: below ? r.bottom + 8 : r.top - 8, below });
    };
    const over = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; const t = tipOf(e.target as Element);
      if (!t) { cur.current = null; window.clearTimeout(timer.current); setTip(null); return; }
      if (t.el === cur.current) return; cur.current = t.el; window.clearTimeout(timer.current); setTip(null);
      timer.current = window.setTimeout(() => { if (cur.current === t.el && t.el.isConnected) show(t); }, DELAY);
    };
    const down = (e: PointerEvent) => {
      window.clearTimeout(timer.current); setTip(null);
      if (e.pointerType !== 'touch') return; const t = tipOf(e.target as Element); if (!t) return;
      timer.current = window.setTimeout(() => { show(t); window.setTimeout(() => setTip(null), 1800); }, PRESS);
    };
    const hide = () => { window.clearTimeout(timer.current); cur.current = null; setTip(null); };
    document.addEventListener('pointerover', over); document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointerup', () => window.clearTimeout(timer.current)); window.addEventListener('scroll', hide, true); window.addEventListener('keydown', hide);
    return () => { document.removeEventListener('pointerover', over); document.removeEventListener('pointerdown', down, true); window.removeEventListener('scroll', hide, true); window.removeEventListener('keydown', hide); };
  }, []);
  if (!tip) return null;
  return <div className={`tt ${tip.below ? 'tt-below' : ''}`} role="tooltip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>;
}
