import type { DeckApi } from './deck';

export interface CountdownApi {
  /** Reset the timer to a full duration (called on any deck navigation). */
  reset(): void;
}

export interface CountdownOptions {
  deck: DeckApi;
  deckEl: HTMLElement;
  isTouching: () => boolean;
  durationMs?: number;
}

/**
 * Auto-advance countdown (7s per card, loops): only runs while the deck is
 * on screen, pauses while the user is touching/dragging, and can be
 * paused/resumed with the pause button. Respects prefers-reduced-motion
 * (auto-advance off by default).
 */
export function createCountdown(options: CountdownOptions): CountdownApi | null {
  const pauseBtn = document.getElementById('pauseBtn');
  const pauseLabel = document.getElementById('pauseLabel');
  const iconPause = document.getElementById('iconPause');
  const iconPlay = document.getElementById('iconPlay');
  const countRow = document.getElementById('countRow');
  const countLabel = document.getElementById('countLabel');
  const countFill = document.getElementById('countFill');
  const countNum = document.getElementById('countNum');
  if (
    !pauseBtn ||
    !pauseLabel ||
    !iconPause ||
    !iconPlay ||
    !countRow ||
    !countLabel ||
    !countFill ||
    !countNum
  ) {
    return null;
  }

  const DURATION = options.durationMs ?? 7000;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let playing = !reduceMotion.matches;
  let lastTs: number | null = null;
  let remaining = DURATION;
  let deckInView = true;

  /* Only run the countdown while the Projects deck is on screen */
  if (window.IntersectionObserver) {
    deckInView = false;
    const deckObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) deckInView = entry.isIntersecting;
      },
      { threshold: 0.25 },
    );
    deckObserver.observe(options.deckEl);
  }

  const renderPlayState = (): void => {
    pauseBtn.setAttribute('aria-pressed', playing ? 'false' : 'true');
    pauseBtn.setAttribute(
      'aria-label',
      playing ? 'Pause auto-advance' : 'Resume auto-advance',
    );
    pauseLabel.textContent = playing ? 'Pause' : 'Play';
    iconPause.style.display = playing ? '' : 'none';
    iconPlay.style.display = playing ? 'none' : '';
    countRow.classList.toggle('is-paused', !playing);
    countLabel.textContent = playing ? 'Next project in' : 'Deck paused';
  };

  pauseBtn.addEventListener('click', () => {
    playing = !playing;
    if (playing && remaining <= 0) remaining = DURATION;
    renderPlayState();
  });

  const tick = (ts: number): void => {
    if (lastTs === null) lastTs = ts;
    const delta = Math.min(ts - lastTs, 100);
    lastTs = ts;
    if (playing && !options.isTouching() && deckInView) {
      remaining -= delta;
      if (remaining <= 0) {
        options.deck.goTo(options.deck.current + 1, 'fly-left');
        remaining = DURATION;
      }
    }
    countFill.style.width = `${(1 - remaining / DURATION) * 100}%`;
    countNum.textContent = String(Math.max(1, Math.ceil(remaining / 1000)));
    window.requestAnimationFrame(tick);
  };

  renderPlayState();
  window.requestAnimationFrame(tick);

  return {
    reset: () => {
      remaining = DURATION;
    },
  };
}
