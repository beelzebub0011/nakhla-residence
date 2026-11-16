// V12 — Apple-style page transitions between the three experiences (View Transitions API: a soft cross-dissolve with a
// slight depth shift). Falls back to an instant switch where unsupported or under reduced motion.
export function withTransition(fn: () => void) {
  const d = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduced = document.documentElement.dataset.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!d.startViewTransition || reduced) { fn(); return; }
  d.startViewTransition(fn);
}
