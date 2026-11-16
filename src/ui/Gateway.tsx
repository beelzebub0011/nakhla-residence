import { useRef, useState } from 'react';
import { LOCALES, lastExperience, useStore } from '../state/store';
import { LOCALE_META, useT } from '../i18n';
import { Icon, LogoMark } from './Icon';
import { withTransition } from './transition';
import { HERO_SCENE, imageFallback, imageSrc } from '../visual/catalog';

const BASE = import.meta.env.BASE_URL;

/**
 * V11.2 §26 — first entry: one signature exterior (an original Cycles render of the model), the wordmark,
 * one sentence and TWO equal choices. No forced intro, no fake progress, sound off, disclaimer visible.
 */
export function Gateway() {
  const quality = useStore((st) => st.quality); const setQuality = useStore((st) => st.setQuality); const setTier = useStore((st) => st.setTier);
  const { t, locale } = useT();
  const landing = useStore((s) => s.landing); const choose = useStore((s) => s.chooseExperience); const setLocale = useStore((s) => s.setLocale); const set = useStore((s) => s.set);
  const [diff, setDiff] = useState(false); const last = useRef(lastExperience());
  if (!landing) return null;
  return (
    <section className="gateway" aria-labelledby="gw-title" data-testid="gateway">
      <picture className="gw-hero" aria-hidden="true">
        <source type="image/webp" srcSet={`${imageSrc(HERO_SCENE, 960)} 960w, ${imageSrc(HERO_SCENE, 1600)} 1600w, ${imageSrc(HERO_SCENE, 2560)} 2560w`} sizes="100vw" />
        <img src={imageFallback(HERO_SCENE)} alt="" decoding="async" fetchPriority="high" />
      </picture>
      <div className="gw-shade" aria-hidden="true" />
      <div className="gw-inner">
        <header className="gw-head">
          <span className="gw-mark"><LogoMark size={40} /></span>
          <p className="gw-kicker">{t('brand.location')}</p>
          <h1 id="gw-title" className="gw-title">{t('brand.name')}</h1>
          <p className="gw-welcome">{t('gw.welcome')}</p>
        </header>
        <h2 className="gw-choose">{t('gw.choose')}</h2>
        <div className="gw-cards">
          <button type="button" className="gw-card" onClick={() => withTransition(() => choose('3d'))} data-testid="enter">
            <span className="gw-thumb"><img src={`${BASE}gateway/preview_3d.webp`} alt={t('gw.preview3d')} loading="lazy" decoding="async" /><span className="gw-badge"><Icon name="cube" size={14} />{t('gw.3d.badge')}</span>{last.current === '3d' && <span className="gw-last">{t('gw.last')}</span>}</span>
            <span className="gw-body"><b className="gw-card-title">{t('gw.3d.title')}</b><span className="gw-sub">{t('gw.3d.sub')}</span><span className="gw-cta">{t('gw.3d.cta')} <span className="gw-arrow"><Icon name="back" size={16} /></span></span></span>
          </button>
          <button type="button" className="gw-card" onClick={() => withTransition(() => choose('visual'))} data-testid="enter-visual">
            <span className="gw-thumb"><picture><source type="image/webp" srcSet={imageSrc('living_golden', 960)} /><img src={imageFallback('living_golden')} alt={t('gw.previewPhoto')} loading="lazy" decoding="async" /></picture><span className="gw-badge"><Icon name="camera" size={14} />{t('gw.photo.badge')}</span>{last.current === 'visual' && <span className="gw-last">{t('gw.last')}</span>}</span>
            <span className="gw-body"><b className="gw-card-title">{t('gw.photo.title')}</b><span className="gw-sub">{t('gw.photo.sub')}</span><span className="gw-cta">{t('gw.photo.cta')} <span className="gw-arrow"><Icon name="back" size={16} /></span></span></span>
          </button>
        </div>
        <div className="gw-diff">
          <button type="button" aria-expanded={diff} aria-controls="gw-diff-text" onClick={() => setDiff(!diff)}>{t('gw.diff')}</button>
          <p id="gw-diff-text" hidden={!diff}>{t('gw.diffText')}</p>
        </div>
        {/* V12: choose how heavy the experience is, before anything loads (strong vs weak devices) */}
        <div className="gw-device" role="radiogroup" aria-label={t('gw.device')}>
          <span className="gw-device-t">{t('gw.device')}</span>
          <button type="button" role="radio" aria-checked={quality !== 'low'} onClick={() => setQuality('auto')} data-tip={t('gw.devFullTip')}>{t('gw.devFull')}</button>
          <button type="button" role="radio" aria-checked={quality === 'low'} onClick={() => { setQuality('low'); setTier('low'); }} data-tip={t('gw.devSmoothTip')}>{t('gw.devSmooth')}</button>
          <button type="button" className="gw-device-plans" onClick={() => withTransition(() => choose('plans'))} data-testid="gw-plans" data-tip={t('xp.plansTip')}><Icon name="plan" size={15} />{t('xp.plans')}</button>
        </div>
        <footer className="gw-foot">
          <div className="gw-langs" role="group" aria-label={t('ui.language')}>
            {LOCALES.map((l) => <button key={l} type="button" lang={LOCALE_META[l].htmlLang} aria-pressed={locale === l} onClick={() => setLocale(l)}>{LOCALE_META[l].native}</button>)}
          </div>
          <p className="gw-note"><Icon name="soundOff" size={15} /> {t('landing.sound')} · <button type="button" className="gw-lite" onClick={() => withTransition(() => choose('plans'))}>{t('landing.lite')}</button></p>
          <p className="gw-disclaimer">{t('concept.full')}</p>
        </footer>
      </div>
    </section>
  );
}
