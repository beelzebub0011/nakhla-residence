import { lazy, Suspense, useEffect, useState } from 'react';
import { useStore } from './state/store';
import { LOCALE_META, useT } from './i18n';
import { Stage } from './ui/Stage';
import { Breadcrumb, CameraControls, DollNav, ConceptBadge, FloorRail, FocusBar, Toast, TopBar, WebglNotice } from './ui/Chrome';
import { ContextPanel } from './ui/Panels';
import { Overlays } from './ui/Overlays';
import { Gateway } from './ui/Gateway';
import { Tooltips } from './ui/Tooltips';
import { XpNotice } from './ui/XpNotice';
import './styles/gateway.css';

const Hud = lazy(() => import('./ui/Hud').then((m) => ({ default: m.Hud })));
// V11.2 Experience B: the photoreal website is its own lazy chunk (never loaded together with the 3D engine)
const Visual = lazy(() => import('./visual/Visual').then((m) => ({ default: m.Visual })));
const Plans = lazy(() => import('./plans/Plans').then((m) => ({ default: m.Plans })));

export function App() {
  const { t, locale } = useT();
  const lite = useStore((s) => s.lite); const quality = useStore((s) => s.quality); const webgl = useStore((s) => s.webgl); const hud = useStore((s) => s.hud);
  const focus = useStore((s) => s.focus); const motionPref = useStore((s) => s.motionPref); const landing = useStore((s) => s.landing); const view = useStore((s) => s.view); const section = useStore((s) => s.section);
  const experience = useStore((s) => s.experience); const no3dEarly = useStore((s) => s.quality === 'lite' || s.webgl === 'unavailable' || s.lite); const plans = (experience === 'plans' || (no3dEarly && experience !== 'visual')) && !landing; /* V12: the plans section is also the no-WebGL / lite fallback */ const visual = (experience === 'visual' && !landing) || plans;   // "visual" = the 3D shell is off
  const no3d = quality === 'lite' || webgl === 'unavailable';
  const showLite = lite || no3d;
  // the 3D engine starts once the gateway has painted (immediately for a 3D deep link) and never while the photo site is open
  const [stageOk, setStageOk] = useState(!landing);
  useEffect(() => {
    if (stageOk) return;
    if (!landing) { setStageOk(true); return; }
    const h = window.setTimeout(() => setStageOk(true), 1400); return () => window.clearTimeout(h);
  }, [landing, stageOk]);

  // document language / direction follow the locale; 3D coordinates are never mirrored
  useEffect(() => {
    const m = LOCALE_META[locale]; document.documentElement.lang = m.htmlLang; document.documentElement.dir = m.dir;
    document.title = `${t('brand.name')} — ${t('concept.badge')}`;
  }, [locale, t]);
  useEffect(() => { document.documentElement.dataset.motion = motionPref; }, [motionPref]);
  const tier = useStore((st) => st.tier);
  useEffect(() => { document.documentElement.dataset.tier = tier; }, [tier]);   // V11.5: glass materials only where the GPU has headroom
  // OS reduced-motion changes are honoured live, including mid-transition
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => { if (mq.matches) useStore.getState().setMotionPref('reduced'); };
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);
  // Escape always steps back / closes the single overlay; no keyboard trap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { const s = useStore.getState(); if (s.overlay) s.openOverlay(null); else if (s.cine.active) s.back(); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app" data-section={section} data-view={view} data-landing={landing} data-lite={showLite} data-focus={focus && !showLite} data-experience={plans ? 'plans' : visual ? 'visual' : '3d'}>
      <a className="skip" href="#controls">{t('ui.skipToContent')}</a>
      {!no3d && !visual && stageOk && <div className="stage-wrap" hidden={showLite}><Stage /></div>}
      {visual && !plans && <Suspense fallback={<div className="vs-loading" aria-busy="true" />}><Visual /></Suspense>}
      {plans && <Suspense fallback={<div className="vs-loading" aria-busy="true" />}><Plans /></Suspense>}
      {/* while the gateway is open, the 3D interface behind it is inert (no focus, no clicks) */}
      {!visual && <div className="shell-3d" inert={landing}><TopBar /></div>}
      {!visual && <WebglNotice />}
      {!visual && (
        <main id="controls" className="hud-layer" inert={landing}>
          {!landing && <Breadcrumb />}
          {!landing && !showLite && <FloorRail />}
          {!showLite && <ContextPanel />}
          {!showLite && <CameraControls />}
          {!showLite && <DollNav />}
          {!landing && <ConceptBadge />}
        </main>
      )}
      {!visual && !showLite && <FocusBar />}
      {!visual && <XpNotice />}
      <Gateway />
      <Tooltips />
      <Overlays />
      <Toast />
      {hud && <Suspense fallback={null}><Hud /></Suspense>}
    </div>
  );
}
