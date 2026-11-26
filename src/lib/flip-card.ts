/** Hero flip card (Leonidas ⇄ Penelope): click/tap, Flip button, or keyboard. */
export function initFlipCard(): void {
  const flipCard = document.getElementById('flipCard');
  const flipBtn = document.getElementById('flipBtn');
  if (!flipCard || !flipBtn) return;

  const flipFront = flipCard.querySelector('.flip-front') as HTMLElement | null;
  const flipBack = flipCard.querySelector('.flip-back') as HTMLElement | null;
  if (!flipFront || !flipBack) return;

  let flipped = false;

  const syncFlipHeight = (): void => {
    flipCard.style.height = '';
    const h = Math.max(flipFront.offsetHeight, flipBack.scrollHeight);
    flipCard.style.height = `${h}px`;
  };

  const setFlipped = (v: boolean): void => {
    flipped = v;
    flipCard.classList.toggle('flipped', flipped);
    flipCard.setAttribute('aria-pressed', flipped ? 'true' : 'false');
    flipBtn.setAttribute('aria-pressed', flipped ? 'true' : 'false');
    flipCard.setAttribute(
      'aria-label',
      flipped
        ? 'Profile card — showing Penelope. Activate to flip back to Leonidas.'
        : 'Profile card — showing Leonidas. Activate to flip to Penelope.',
    );
    flipFront.setAttribute('aria-hidden', flipped ? 'true' : 'false');
    flipBack.setAttribute('aria-hidden', flipped ? 'false' : 'true');
    if ('inert' in flipFront) {
      flipFront.inert = flipped;
      flipBack.inert = !flipped;
    }
    syncFlipHeight();
  };

  flipCard.addEventListener('click', () => setFlipped(!flipped));
  flipCard.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      setFlipped(!flipped);
    }
  });
  flipBtn.addEventListener('click', () => setFlipped(!flipped));

  if ('inert' in flipBack) flipBack.inert = true;
  syncFlipHeight();
  window.addEventListener('resize', syncFlipHeight);
  if (document.fonts?.ready) {
    void document.fonts.ready.then(syncFlipHeight);
  }
  const flipImg = flipBack.querySelector('img');
  if (flipImg && !flipImg.complete) {
    flipImg.addEventListener('load', syncFlipHeight);
  }
}
