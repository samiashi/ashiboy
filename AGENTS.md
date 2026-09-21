# AGENTS.md

Ashiboy — party games played in the room, straight from phones. **No backend:**
one player's browser hosts each game over PeerJS (WebRTC data channels).

## Commands

```bash
npm install          # install (Node 24 — see .nvmrc, engines: 24.x)
npm run dev          # Vite dev server, served on the LAN (--host) for phones
npm test             # full suite (vitest run); single file: npx vitest run <path>
npm run lint         # bans relative imports — use the @/ alias
npm run lint:fix     # auto-rewrites relative imports to @/
npm run format       # prettier --write (check with format:check)
npm run check        # lint + format:check — run before finishing any task
npm run fix          # lint:fix + format
npm run typecheck    # tsc --noEmit (strict)
npm run build        # typecheck + production build to dist/
npm run icons        # regenerate PWA icons (scripts/generate-icons.mjs)
npm run words        # regenerate Codenames' word list (scripts/generate-words.mjs)
```

CI (`.github/workflows/ci.yml`) runs lint, format:check, typecheck, test, build
on every push/PR. Dependabot handles weekly npm + monthly Actions updates.

## Stack (pinned — do not downgrade to fix tooling)

React 19 + TypeScript 7 + Vite 8 + Vitest 5 + Motion 13 + PeerJS + happy-dom +
Testing Library. Motion is used as LazyMotion/`domAnimation` with `m`
components only (wired in `main.tsx`).

## Architecture

- `src/App.tsx` — hash router (`#/` hub, `#/<game>`, `?join=CODE` invites).
- `src/hub/` — landing page. `src/games/registry.ts` — one entry per game
  (slug, tile art in `src/assets/`, lazy component).
- Each game is self-contained: `src/games/<name>/{engine,net,ui,sound,styles}`.
  New games copy this shape; see `src/shared/README.md` for the checklist.
- `src/shared/` — design system: components, `useGameSession`, sound-kit,
  theme tokens. Rules for extending it: `src/shared/README.md`.
- Game engines are pure reducers: `reduce(state, action, rng, now)` with
  **injectable RNG and clock** — tests must stay deterministic (fixed seeds).
- The host browser owns full state; clients receive personalized views via
  `viewFor`. NEVER send raw state. NEVER leak secrets (roles, keys, tokens).
- Networking (host/client/session) is intentionally duplicated per game —
  do NOT unify it into a generic factory.

## Conventions

- All imports use the `@/` alias (tsconfig `paths` + vite `resolve.alias`).
  `npm run lint` fails on any `./` or `../` import.
- Compose UI from `src/shared/components`; game stylesheets hold ONLY
  game-specific styles. Shared classes live in `styles.css`.
- Colors and typography come from `:root` tokens only — never raw hex for
  site chrome. Game flourishes may keep local colors.
- Co-locate tests (`*.test.ts(x)` next to source). UI tests need the
  `// @vitest-environment happy-dom` header; motion is stubbed in tests
  (`src/test-motion-stub.tsx`), so test structure/behavior, never animation.
- Prettier: single quotes, 100 cols, LF, semicolons. Run `npm run fix`
  before finishing, then re-read any file you must still edit (formatting
  moves text around).
- Update `docs/ideal-party-flow.md` / `docs/<game>-flow.md` in the same
  change when behavior changes — specs must never lie about the app.

## Boundaries

- Always run `npm run check`, `tsc`, and the full test suite before
  finishing. Add or update tests for the code you change.
- Never downgrade TypeScript to satisfy lint tooling. typescript-eslint
  hard-crashes on TS 7 and TS 7 has no classic compiler API — documented
  dead end, do not retry. The custom `scripts/lint-imports.mjs` is the
  linter; extend it instead.
- Never expose secret game state to clients — every new view field gets a
  privacy test proving who can (and cannot) see it.
- Never copy publishers' content (CGE word lists, art, rule text). Codenames'
  word list is generated from permissively licensed word libraries by
  `scripts/generate-words.mjs` — edit the script, never `words.ts` by hand,
  and never paste a publisher's list. Artwork and How-to-Play copy stay
  original.
- Never edit `dist/` (build output). Never commit `node_modules`.
- Do not commit or push unless explicitly asked.

## Gotchas (verified — these will bite)

- TS 7 removed `baseUrl`: path mapping must be `"@/*": ["./src/*"]`.
- `vite.config.ts` needs `@types/node` (installed) for its `node:url` import.
- happy-dom lacks implicit `<label>` naming — query checkboxes structurally,
  not by accessible name. It also lacks WAAPI (hence the motion stub).
- `AnimatePresence mode="wait"` requires a keyed `m` child.
- Fake timers (`vi.useFakeTimers`) and `user-event` conflict — use
  `fireEvent` in timer tests.
- PeerJS needs internet even on LAN (cloud signaling); game traffic is P2P.
- The host tab IS the room: if it closes, the game ends (no host migration).
- `useGameSession` callbacks must stay referentially stable; it takes all
  game-specific factories (host, client, sounds, storage) as options.
- License is proprietary (`UNLICENSED`) — no copying code out, either.

## Docs map

- `README.md` — what the site is, how to run/play it.
- `docs/ideal-party-flow.md` — Mafia target experience + limitations.
- `docs/codenames-flow.md` — Codenames rules spec + edge cases + build decisions.
- `src/shared/README.md` — design-system catalog, tokens/theming, game-#3 checklist.
