/**
 * Synthesized UI sounds (Web Audio API — no audio files, the site stays
 * self-contained) + the mute state, persisted in localStorage.
 *
 * Sounds are only ever triggered from a user gesture (click / tap /
 * keyboard) or from the deck auto-advance, which only runs after the page
 * has been open long enough for a gesture to have unlocked audio. The
 * AudioContext is created lazily on first play and resumed on every play
 * attempt; if the browser still has it suspended (no gesture yet) the play
 * call is a silent no-op — never an error, never a blocked autoplay.
 *
 * Every sound is short (< 300 ms) and quiet.
 */

const STORAGE_KEY = 'profile-page:sound-muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;

try {
  muted = window.localStorage.getItem(STORAGE_KEY) === '1';
} catch {
  muted = false;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  try {
    window.localStorage.setItem(STORAGE_KEY, m ? '1' : '0');
  } catch {
    /* Private mode — the mute state just lives in memory. */
  }
}

function ensureContext(): AudioContext | null {
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      const len = ctx.sampleRate;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  freq: number;
  freqEnd?: number;
  dur: number; // seconds
  type?: OscillatorType;
  gain: number;
  delay?: number;
}

function tone(opts: ToneOpts): void {
  const ac = ensureContext();
  if (!ac || !master || muted) return;
  const t0 = ac.currentTime + (opts.delay ?? 0);
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), t0 + opts.dur);
  }
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(opts.gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.05);
}

interface NoiseOpts {
  dur: number; // seconds
  type?: BiquadFilterType;
  freq: number;
  freqEnd?: number;
  q?: number;
  gain: number;
  delay?: number;
}

function noise(opts: NoiseOpts): void {
  const ac = ensureContext();
  if (!ac || !master || !noiseBuf || muted) return;
  const t0 = ac.currentTime + (opts.delay ?? 0);
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = opts.type ?? 'bandpass';
  filter.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqEnd !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t0 + opts.dur);
  }
  filter.Q.value = opts.q ?? 1.1;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(opts.gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + opts.dur + 0.05);
}

/** Soft whoosh + tick when the hero card flips. (~180 ms) */
export function playFlip(): void {
  if (muted) return;
  noise({ dur: 0.16, freq: 500, freqEnd: 2600, q: 1.4, gain: 0.08 });
  tone({ freq: 880, freqEnd: 1170, dur: 0.07, gain: 0.035, delay: 0.1 });
}

/** Airy swish as a deck card is thrown. (~150 ms) */
export function playThrow(): void {
  if (muted) return;
  noise({ dur: 0.15, freq: 1900, freqEnd: 480, q: 1.2, gain: 0.09 });
}

/** Muted low thud as the next card lands. (~140 ms) */
export function playLand(): void {
  if (muted) return;
  tone({ freq: 120, freqEnd: 55, dur: 0.14, type: 'sine', gain: 0.16 });
  noise({ dur: 0.04, type: 'lowpass', freq: 320, gain: 0.05 });
}

/** Barely-there tick for a generic tap. (~45 ms) */
export function playTap(): void {
  if (muted) return;
  tone({ freq: 1250, dur: 0.045, gain: 0.03 });
}

/**
 * Mute / unmute toggle button in the hero (next to Flip). Persists in
 * localStorage; default is sound ON. Turning sound back on plays a tiny
 * confirmation tick (the click itself is a gesture, so it is audible).
 */
export function initSoundToggle(): void {
  const btn = document.getElementById('soundBtn');
  if (!btn) return;
  const label = document.getElementById('soundLabel');
  const iconOn = document.getElementById('iconSoundOn');
  const iconOff = document.getElementById('iconSoundOff');

  const render = (): void => {
    const on = !muted;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Mute sounds' : 'Unmute sounds');
    btn.classList.toggle('is-muted', muted);
    if (label) label.textContent = on ? 'Sound on' : 'Sound off';
    if (iconOn) iconOn.style.display = on ? '' : 'none';
    if (iconOff) iconOff.style.display = on ? 'none' : '';
  };

  btn.addEventListener('click', () => {
    setMuted(!muted);
    render();
    if (!muted) playTap();
  });

  render();
}
