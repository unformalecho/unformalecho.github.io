const GITHUB_URL = 'https://github.com/unformalecho';

/** Copy GitHub URL button: Clipboard API first, execCommand fallback. */
export function initCopyButton(): void {
  const copyBtn = document.getElementById('copyBtn');
  const copyNote = document.getElementById('copyNote');
  if (!copyBtn || !copyNote) return;

  let noteTimer: number | null = null;

  copyBtn.addEventListener('click', () => {
    const done = (ok: boolean): void => {
      copyNote.textContent = ok ? 'Copied to clipboard' : GITHUB_URL;
      if (noteTimer !== null) window.clearTimeout(noteTimer);
      noteTimer = window.setTimeout(() => {
        copyNote.textContent = '';
      }, 2600);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(GITHUB_URL).then(
        () => done(true),
        () => done(false),
      );
    } else {
      const ta = document.createElement('textarea');
      ta.value = GITHUB_URL;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
      done(ok);
    }
  });
}
