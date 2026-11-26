export type FlyDirection = 'fly-left' | 'fly-right';

export interface DeckApi {
  readonly total: number;
  readonly current: number;
  goTo(targetIdx: number, directionHint?: FlyDirection): void;
  isTouching(): boolean;
}

export interface DeckOptions {
  /** Called whenever the deck navigates (button, dot, key, drag throw, auto-advance). */
  onNavigate: () => void;
}

const SWIPE_THRESHOLD = 65;

interface DragState {
  x: number;
  y: number;
  dx: number;
  horizontal: boolean | null;
  card: HTMLElement;
  nextCard: HTMLElement;
}

/**
 * Projects mini card stack engine: physical stack positions, drag/throw
 * physics (65px throw threshold, snap-back), dots, prev/next, arrow keys.
 * Returns null when the deck markup is missing.
 */
export function createDeck(options: DeckOptions): DeckApi | null {
  const deckEl = document.getElementById('projectDeck');
  const stackEl = document.getElementById('cardStack');
  if (!deckEl || !stackEl) return null;

  const cards = Array.prototype.slice.call(
    stackEl.querySelectorAll('.card'),
  ) as HTMLElement[];
  const total = cards.length;
  const names = ['JustClickIt', 'Coming soon', 'Coming soon', 'Coming soon', 'Coming soon'];

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const nowLabel = document.getElementById('nowLabel');
  const dotsWrap = document.getElementById('dots');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let current = 0;
  const dots: HTMLButtonElement[] = [];

  const cardAt = (i: number): HTMLElement => {
    const card = cards[i];
    if (!card) throw new Error(`deck: no card at index ${i}`);
    return card;
  };

  const pad = (n: number): string => (n < 10 ? '0' : '') + n;

  /* Assign physical stack positions relative to `current` */
  const updateStack = (flyDir?: FlyDirection, thrownIdx?: number): void => {
    for (let i = 0; i < total; i++) {
      const card = cardAt(i);
      /* Clear any inline drag transform */
      card.style.transform = '';
      card.style.opacity = '';
      const stampL = card.querySelector('.swipe-stamp.left') as HTMLElement | null;
      const stampR = card.querySelector('.swipe-stamp.right') as HTMLElement | null;
      if (stampL) stampL.style.opacity = '0';
      if (stampR) stampR.style.opacity = '0';

      /* Calculate forward cyclic distance in deck */
      const rel = (i - current + total) % total;

      if (i === thrownIdx && flyDir) {
        card.setAttribute('data-pos', flyDir);
        card.setAttribute('aria-hidden', 'true');
      } else if (rel === 0) {
        card.setAttribute('data-pos', '0');
        card.setAttribute('aria-hidden', 'false');
      } else if (rel === 1) {
        card.setAttribute('data-pos', '1');
        card.setAttribute('aria-hidden', 'true');
      } else if (rel === 2) {
        card.setAttribute('data-pos', '2');
        card.setAttribute('aria-hidden', 'true');
      } else {
        card.setAttribute('data-pos', 'hidden');
        card.setAttribute('aria-hidden', 'true');
      }
    }

    /* After throw animation settles, tuck thrown card cleanly to bottom of deck */
    if (typeof thrownIdx === 'number' && flyDir) {
      const idxToTuck = thrownIdx;
      window.setTimeout(() => {
        if (idxToTuck !== current) {
          const relAfter = (idxToTuck - current + total) % total;
          const posAfter = relAfter === 1 ? '1' : relAfter === 2 ? '2' : 'hidden';
          cardAt(idxToTuck).setAttribute('data-pos', posAfter);
        }
      }, reduceMotion.matches ? 20 : 380);
    }

    /* Update controls & labels */
    for (let j = 0; j < total; j++) {
      const dot = dots[j];
      if (dot) dot.setAttribute('aria-current', j === current ? 'true' : 'false');
    }
    if (nowLabel) nowLabel.textContent = `${pad(current + 1)} — ${names[current] ?? ''}`;
  };

  const goTo = (targetIdx: number, directionHint?: FlyDirection): void => {
    const nextIdx = ((targetIdx % total) + total) % total;
    if (nextIdx === current) {
      updateStack();
      return;
    }
    const oldIdx = current;
    let dir = directionHint;
    if (!dir) {
      const diff = (nextIdx - oldIdx + total) % total;
      dir = diff <= total / 2 ? 'fly-left' : 'fly-right';
    }
    current = nextIdx;
    options.onNavigate();
    /* Reset scroll position inside the newly revealed card */
    const scroller = cardAt(current).querySelector('.card-scroll');
    if (scroller) scroller.scrollTop = 0;
    updateStack(dir, oldIdx);
  };

  /* Build pagination dots */
  if (dotsWrap) {
    for (let i = 0; i < total; i++) {
      const idx = i;
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'dot';
      d.setAttribute('aria-label', `Select project card ${idx + 1}: ${names[idx] ?? ''}`);
      d.addEventListener('click', () => goTo(idx));
      dotsWrap.appendChild(d);
      dots.push(d);
    }
  }

  prevBtn?.addEventListener('click', () => goTo(current - 1, 'fly-right'));
  nextBtn?.addEventListener('click', () => goTo(current + 1, 'fly-left'));

  /* Arrow keys only while the Projects deck has focus */
  deckEl.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      goTo(current + 1, 'fly-left');
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      goTo(current - 1, 'fly-right');
      e.preventDefault();
    }
  });

  /* ---------- Interactive Card Throw / Drag Physics ---------- */
  let drag: DragState | null = null;
  let suppressClick = false;
  let touching = false;

  const startDrag = (x: number, y: number, target: EventTarget | null): void => {
    /* Do not hijack clicks directly on links or buttons */
    const el = target as Element | null;
    if (el?.closest?.('a, button')) return;
    drag = {
      x,
      y,
      dx: 0,
      horizontal: null,
      card: cardAt(current),
      nextCard: cardAt((current + 1) % total),
    };
  };

  const moveDrag = (x: number, y: number): boolean => {
    if (!drag) return false;
    const dx = x - drag.x;
    const dy = y - drag.y;

    if (drag.horizontal === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return false;
      drag.horizontal = Math.abs(dx) > Math.abs(dy);
      if (drag.horizontal) {
        drag.card.classList.add('is-dragging');
        drag.nextCard.classList.add('is-dragging');
      }
    }
    if (!drag.horizontal) return false;

    drag.dx = dx;
    const rot = dx * 0.045;
    const liftY = -Math.abs(dx) * 0.04;
    drag.card.style.transform = `translate3d(${dx}px, ${liftY}px, 0) rotate(${rot}deg)`;

    /* Subtle spring-up preview on the 2nd card underneath */
    const progress = Math.min(1, Math.abs(dx) / 140);
    const subX = 8 * (1 - progress);
    const subY = 10 * (1 - progress);
    const subRot = 1.35 * (1 - progress);
    const subScale = 0.985 + 0.015 * progress;
    drag.nextCard.style.transform =
      `translate3d(${subX}px, ${subY}px, 0) rotate(${subRot}deg) scale(${subScale})`;

    /* Show directional stamp */
    const stampL = drag.card.querySelector('.swipe-stamp.left') as HTMLElement | null;
    const stampR = drag.card.querySelector('.swipe-stamp.right') as HTMLElement | null;
    if (dx < -18) {
      if (stampL) stampL.style.opacity = String(Math.min(1, (-dx - 18) / 55));
      if (stampR) stampR.style.opacity = '0';
    } else if (dx > 18) {
      if (stampR) stampR.style.opacity = String(Math.min(1, (dx - 18) / 55));
      if (stampL) stampL.style.opacity = '0';
    } else {
      if (stampL) stampL.style.opacity = '0';
      if (stampR) stampR.style.opacity = '0';
    }

    return true;
  };

  const endDrag = (): void => {
    if (!drag) return;
    const d = drag;
    drag = null;
    d.card.classList.remove('is-dragging');
    d.nextCard.classList.remove('is-dragging');

    if (!d.horizontal) return;

    if (Math.abs(d.dx) > 8) {
      suppressClick = true;
      window.setTimeout(() => {
        suppressClick = false;
      }, 320);
    }

    if (d.dx <= -SWIPE_THRESHOLD) {
      goTo(current + 1, 'fly-left');
    } else if (d.dx >= SWIPE_THRESHOLD) {
      goTo(current - 1, 'fly-right');
    } else {
      /* Snap back smoothly into stack */
      updateStack();
    }
    options.onNavigate();
  };

  const cancelDrag = (): void => {
    if (!drag) return;
    drag.card.classList.remove('is-dragging');
    drag.nextCard.classList.remove('is-dragging');
    drag = null;
    updateStack();
  };

  document.addEventListener(
    'click',
    (e: MouseEvent) => {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        suppressClick = false;
      }
    },
    true,
  );

  stackEl.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      touching = true;
      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (t) startDrag(t.clientX, t.clientY, e.target);
      }
    },
    { passive: true },
  );
  stackEl.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (drag && e.touches.length === 1) {
        const t = e.touches[0];
        if (t && moveDrag(t.clientX, t.clientY)) e.preventDefault();
      }
    },
    { passive: false },
  );
  stackEl.addEventListener('touchend', () => {
    touching = false;
    endDrag();
  });
  stackEl.addEventListener('touchcancel', () => {
    touching = false;
    cancelDrag();
  });

  if (window.PointerEvent) {
    stackEl.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button === 0) {
        touching = true;
        startDrag(e.clientX, e.clientY, e.target);
      }
    });
    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (drag && e.pointerType === 'mouse') moveDrag(e.clientX, e.clientY);
    });
    window.addEventListener('pointerup', (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        touching = false;
        endDrag();
      }
    });
    window.addEventListener('pointercancel', (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        touching = false;
        cancelDrag();
      }
    });
  }

  /* Initialize stack */
  updateStack();

  return {
    total,
    get current() {
      return current;
    },
    goTo,
    isTouching: () => touching,
  };
}
