import './styles/main.css';
import { initCopyButton } from './lib/copy';
import { initFlipCard } from './lib/flip-card';
import { createDeck } from './lib/deck';
import { createCountdown } from './lib/countdown';
import { initSoundToggle } from './lib/sound';
import { initTapFx } from './lib/fx';

initSoundToggle();
initTapFx();
initCopyButton();
initFlipCard();

const deckEl = document.getElementById('projectDeck');

let countdown: ReturnType<typeof createCountdown> = null;
const deck = deckEl ? createDeck({ onNavigate: () => countdown?.reset() }) : null;
if (deck && deckEl) {
  countdown = createCountdown({
    deck,
    deckEl,
    isTouching: () => deck.isTouching(),
  });
}
