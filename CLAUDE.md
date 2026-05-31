# UNO — Project Guide for Claude Code

## What this is
A browser-based UNO card game built as a PWA. Two modes:
- **Solo / Local** — single device, vs AI or pass-and-play
- **Play Together** — WebRTC P2P multiplayer via PeerJS (no backend needed)

## Stack
- React 19 + TypeScript, Vite 8, lightningcss (via Vite)
- PeerJS 1.5 for WebRTC signaling
- No state library — `useReducer` + `useRef` pattern

## Commands
```bash
npm run build        # tsc + vite build + postcache.cjs (injects SW precache)
npx serve dist       # serve the built PWA locally
npm run tunnel:ngrok # expose port 3000 via ngrok for device testing
```
Dev server (`npm run dev`) does NOT register the service worker — that's intentional.

## Key architecture

### Game engine (`src/game/`)
Pure functions, no side effects. `gameEngine.ts` exports `initGame`, `playCard`, `drawCard`, `passTurn`, `callUno`, `chooseColor`, `processAiTurn`. All return a new `GameState` — never mutate.

### Solo mode
`useGameEngine` hook wraps the engine with `useReducer`. `GameBoard` renders it.

### Multiplayer — host-relay pattern
`useMultiplayer` hook (`src/hooks/useMultiplayer.ts`):
- **Host**: runs the game engine locally via `useReducer(hostReducer)`. Receives guest actions over PeerJS DataConnection, dispatches them, broadcasts normalized state back.
- **Guest**: sends action messages to host, receives `MultiplayerGameState` (own cards visible, opponents show card counts only).
- PeerJS peer ID format: `uno-room-XXXX` (4-char code, safe alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`)
- All mutable state accessed inside PeerJS event handlers lives in refs to avoid stale closures.
- `disconnectedCount` state triggers the auto-handle effect when a player disconnects mid-turn (refs alone don't trigger re-renders).

### Localization (`src/i18n/`)
- `uk.ts` — Ukrainian (default), defines the `Translations` interface
- `en.ts` — English
- `LanguageContext.tsx` — React context + `useTranslation()` hook, persists choice to `localStorage`
- Language toggle is on the Home screen only

## Build pipeline details
`scripts/postcache.cjs` runs after Vite and does two things to `dist/sw.js`:
1. Replaces `CACHE_VERSION = 'BUILD_TS'` with a real timestamp
2. Replaces `PRECACHE_URLS = []` with the full list of built files

Without this, the service worker caches nothing.

## Critical gotchas

### Service worker + `npx serve`
`npx serve` adds `Vary` headers. `caches.match()` without `{ ignoreVary: true }` fails even when the file is in cache. All fallback `caches.match()` calls in `public/sw.js` must use `ignoreVary: true`.

### CSS nesting in lightningcss
`@keyframes` cannot be nested inside a CSS rule — must be at top level. BEM modifier nesting (`&--active`) works but use explicit flat classes when debugging.

### Draw rule
Players can only draw if they have **no playable card** in hand. Enforced at UI level (Draw button disabled, draw pile click disabled) in both `GameBoard` and `MultiplayerGame`.

### Turn timer
60 seconds per turn, multiplayer only. The HOST enforces it (auto-draws/passes in `useMultiplayer.ts`). The UI shows a visual countdown that resets when `currentPlayerId` or `phase` changes.

## File map
```
src/
  game/           pure game logic (deck, rules, engine, ai)
  hooks/
    useGameEngine.ts     solo mode
    useMultiplayer.ts    WebRTC multiplayer (host + guest)
    usePwaInstall.ts     PWA install prompt
  components/
    HomeScreen/          home + language toggle
    PlayerSetup/         solo game setup
    GameBoard/           solo game board
    MultiplayerSetup/    create/join room UI
    MultiplayerLobby/    waiting room
    MultiplayerGame/     multiplayer board
    Card/ Hand/ ColorPicker/ ActionLog/ PassDevice/ OpponentHand/
  i18n/            uk.ts, en.ts, LanguageContext.tsx
  types/           game.ts, multiplayer.ts
  styles/          theme.css (CSS custom properties)
public/
  sw.js            service worker (placeholders replaced at build time)
  manifest.json    PWA manifest
scripts/
  postcache.cjs    post-build: injects SW precache manifest
  generate-icons.cjs   one-off icon generator (not in build pipeline)
  generate-screenshots.cjs  one-off screenshot generator (not in build pipeline)
```
