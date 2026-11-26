/**
 * Page-wide tap effect: a small monochrome ring + lime dot that blooms at
 * the exact pointer position, plus a barely-there tick sound.
 *
 * Visual only — the ripple is pointer-events: none and never intercepts
 * input, and it never moves or resizes anything. Under
 * prefers-reduced-motion the ring is skipped entirely (the soft tick stays,
 * since that setting is about motion).
 */
import { playTap } from './sound';

const MAX_RIPPLES = 12;
const RIPPLE_MS = 600;

export function initTapFx(): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.addEventListener(
    'pointerdown',
    (e: PointerEvent) => {
      if (e.button !== 0) return;
      playTap();
      if (reduceMotion.matches) return;

      const existing = document.querySelectorAll('.fx-ripple');
      if (existing.length >= MAX_RIPPLES) existing[0]?.remove();

      const ring = document.createElement('span');
      ring.className = 'fx-ripple';
      ring.setAttribute('aria-hidden', 'true');
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      document.body.appendChild(ring);
      window.setTimeout(() => ring.remove(), RIPPLE_MS);
    },
    { passive: true },
  );
}
