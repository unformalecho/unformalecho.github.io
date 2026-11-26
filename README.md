# Leonidas — Profile Page

Vite + TypeScript build of the profile page. Migrated from a single static
HTML file (`~/workspace/user/files/Profile-Page-Enhanced.html`, kept untouched
as the source of truth) into a proper project. Not a git repo, just a local
mirror — same convention as `~/workspace/justclickit/`.

## What's on the page

- Brutalist monochrome editorial style with the lime-green visual refinement
  layer (`#b7f34a` light / `#c4ff62` dark), transparent page background,
  light/dark via `prefers-color-scheme`.
- Hero flip card (Leonidas ⇄ Penelope) — click/tap, Flip button, keyboard.
- Stats: "Project — 1 so far".
- Projects mini card stack: 1 live JustClickIt card + 4 mystery "coming soon"
  cards, with drag/throw physics (65px throw threshold, snap-back) and a 7s
  auto-advance countdown with pause/play that only runs while the deck is
  visible.
- Stack: "Things I mess around with".
- Kate Crawford closing quote.

## Run

```sh
npm install
npm run dev      # dev server
npm run build    # tsc + vite build -> dist/
npm run preview  # serve the production build
```

## Structure

```
index.html            # markup (body copied verbatim from the source HTML)
src/main.ts           # entry: wires the modules together
src/lib/copy.ts       # Copy GitHub URL button
src/lib/flip-card.ts  # hero flip card
src/lib/deck.ts       # Projects card stack engine + drag physics
src/lib/countdown.ts  # 7s auto-advance countdown
src/styles/main.css   # all page CSS, verbatim from the source HTML
src/assets/           # helmet-black.png, helmet-white.png, penelope-avatar.webp
```

## Deploy notes

- `vite.config.ts` uses `base: '/'` (user-site default, e.g.
  `https://unformalecho.github.io/`). The deploy target is not decided yet;
  for a project site, change `base` to the repo path first.
- Fonts load from Google Fonts CDN at runtime (Playfair Display, Inter,
  JetBrains Mono), same as the static version.
