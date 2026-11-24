# Lull — Below the Fold

A cinematic scroll experience that begins as a polished sleep-tech marketing site and slowly becomes something much less comforting.

## Run

```sh
npm install
npm run dev
```

Open the local Vite URL printed in the terminal.

## Build

```sh
npm run build
npm run preview
```

## Experience

- Editorial, responsive product marketing with a custom CSS product render
- Scroll-linked scene changes, surveillance UI, room evidence, and a sticky horror finale
- Optional Web Audio soundscape and a timed, interactive night recording
- Product preview panel, story carousel, mobile navigation, and a working reset control
- Keyboard-accessible controls, focus-managed dialog, reduced-motion support, and sound off by default

The product reservation is explicitly a concept demo; no checkout or payment is connected.

## Tests

```sh
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright install chromium
npm test
```

Tests cover the desktop narrative, audio/recording controls, modal and reset flows, mobile overflow/navigation, and reduced-motion behavior.

## Stack

React, Vite, plain CSS, Lucide icons, and Playwright. Photography is served locally from `public/images`.
