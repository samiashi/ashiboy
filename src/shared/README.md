# Shared kit (`src/shared`)

Everything in here is used by two or more games (or is designed to be).
Game folders hold only what makes that game _that game_: rules, roles,
role-specific screens, and flavor styles.

## Layout

```
src/shared/
├── README.md            # you are here
├── identity.ts          # site-wide name + avatar profile, RoomTicket shape
├── ids.ts               # randomId / randomToken / makeRoomCode
├── format.ts            # formatClock and friends
├── avatars.ts           # the shared emoji roster
├── theme.ts             # theme constants for non-CSS contexts (QR colors…)
├── sound-kit.ts         # Web Audio primitives: tone, noise, mute, buzz
├── useWakeLock.ts       # screen wake-lock hook
├── useGameSession.ts    # full host/guest session lifecycle hook
└── components/          # GameHome, TopBar, Toast, RoomCodeCard, AvatarPicker,
                         # ProfilePreview, Stepper, PresetRow, CheckRow,
                         # CountdownRing
```

## Rules for adding to the kit

1. **Used twice, or obviously about to be.** One game using it stays in the game.
2. **No game words inside.** Copy, colors-by-role, and rules stay in games;
   the kit takes them as props/children.
3. **CSS classes live in `styles.css`** next to the component, never in game
   stylesheets. Game stylesheets hold only game-only styles.

## Theming

The whole visual language is CSS custom properties on `:root` in
`styles.css` (`--gold`, `--accent`, `--team-red`, `--paper`, `--font-display`,
…). **To retheme the site: override those tokens** — components reference
nothing else. Game-specific flourishes (gazette paper, night sky) keep local
colors on purpose. Anything needed outside CSS (QR code ink) mirrors tokens
in `theme.ts` — change both together.

Motion language lives in `src/anim.ts` (springs, staggers, screen swaps);
`MotionConfig reducedMotion="user"` in `main.tsx` keeps it accessible.

## Adding game #3

1. `src/games/<name>/` with `engine/` (pure reducer + `viewFor` + tests),
   `net/` (host/client reusing this kit's session shape), `ui/`, one CSS file
   with _only_ game-specific styles.
2. Compose screens from `src/shared/components` + global `.btn`/`.card`/…
   classes; run game logic through `useGameSession`.
3. Register one line in `src/games/registry.ts` with tile artwork in
   `src/assets/`.
4. Add the flow spec in `docs/` before building, like the others did.
