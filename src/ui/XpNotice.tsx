import { useEffect } from 'react';
import { useStore } from '../state/store';
import { useT, type MsgKey } from '../i18n';
import { Icon } from './Icon';

/** Honest note after switching from the photo site into 3D when the place could not be matched exactly. */
export function XpNotice() {
  const { t } = useT();
  const notice = useStore((s) => s.sceneNotice); const set = useStore((s) => s.set);
  useEffect(() => { if (!notice) return; const h = window.setTimeout(() => set({ sceneNotice: null }), 9000); return () => window.clearTimeout(h); }, [notice, set]);
  if (!notice) return null;
  return <p className="xp-notice" role="status"><Icon name="info" size={16} /><span>{t(`vs.n.${notice}` as MsgKey)}</span></p>;
}
