import { useStore } from '../state/store';
import { useT } from '../i18n';
import { withTransition } from './transition';

/** V11.2 §27 — the one global "3D | Photoreal" switch. Keeps floor / unit / room / time / language / sound. */
export function ExperienceSwitch({ tone = 'light', alt = false }: { tone?: 'light' | 'dark'; alt?: boolean }) {
  const { t } = useT();
  const experience = useStore((s) => s.experience); const choose = useStore((s) => s.chooseExperience);
  return (
    <div className={`xp-switch xp-${tone}`} role="group" aria-label={t('xp.label')} data-active={experience}>
      <span className="xp-ind" aria-hidden="true" />
      <button type="button" aria-pressed={experience === '3d'} onClick={() => experience !== '3d' && withTransition(() => choose('3d'))} data-testid={alt ? undefined : 'xp-3d'} title={t('xp.3dTip')}>{t('xp.3d')}</button>
      <button type="button" aria-pressed={experience === 'visual'} onClick={() => experience !== 'visual' && withTransition(() => choose('visual'))} data-testid={alt ? undefined : 'xp-visual'} title={t('xp.visualTip')}>{t('xp.visual')}</button>
      <button type="button" aria-pressed={experience === 'plans'} onClick={() => experience !== 'plans' && withTransition(() => choose('plans'))} data-testid={alt ? undefined : 'xp-plans'} title={t('xp.plansTip')}>{t('xp.plans')}</button>
    </div>
  );
}
