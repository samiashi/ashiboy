<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0B0B10,100:3A1420&height=230&section=header&text=ASHIBOY&fontSize=78&fontColor=C9A227&fontAlignY=36&desc=Party%20games%20you%20play%20in%20the%20room&descSize=17&descAlignY=60&descAlign=center" alt="Ashiboy — party games you play in the room" width="100%" />

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=21&duration=2800&pause=1200&color=C9A227&center=true&vCenter=true&width=620&lines=No+moderator.+No+mercy.;Everyone+plays%2C+everyone+lies.;One+room.+One+phone+each." alt="No moderator. No mercy. Everyone plays, everyone lies." />

**Ashiboy** is a website for hosting party games you play in the room,
straight from your phones. **Mafia** and **Codenames** live here; the site is
built so more games can join the table as self-contained modules.

There is **no backend and no gamemaster**. One player's browser hosts the game
and everyone else joins from their own phone with a room code.

</div>

## 🎭 How a game night goes

1. 📲 Everyone opens the site and taps **Mafia**.
2. 🌃 One player taps **Create a game** and shares the 6-letter room code, the
   invite link, or the **QR code** — everyone else joins in seconds.
3. 🎲 Pick a name and an avatar. The host tweaks the setup (number of mafia,
   detective on/off, doctor on/off) and deals the roles.
4. 🃏 Each player secretly flips their own role card. Mafia members see their
   teammates — nobody else sees a thing.
5. 🌙 **Night** — mafia pick a victim (watching each other's picks live), the
   detective investigates someone, the doctor protects someone. Everyone else
   sleeps under the stars.
6. 🗞️ **Day** — the Morning Gazette announces who died (or that nobody did).
   Argue out loud, then everyone votes on their phone. Votes are public, like
   real Mafia — with a live animated tally.
7. 🔨 Repeat until the app declares **Town wins** or **Mafia wins**, with a
   full role reveal and one-tap rematch.

> **Rules of the house:** mafia win when they reach parity with the town; the
> town wins when every mafioso is eliminated. A tied vote eliminates nobody.
> If a night kill leaves mafia and town equal, mafia win immediately.

## ✨ Why it's built for parties

|     |                                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🎭  | **Moderator-free** — the app deals roles, narrates the night, counts the votes and crowns the winner. The host plays like everyone else.                                         |
| 📲  | **Walk away, walk back** — every seat carries a secret rejoin token. Close the tab mid-game, reopen, hit _Rejoin as…_ and you're back with your role intact.                     |
| ⏭️  | **Never stalls** — if someone pockets their phone mid-night or mid-vote, the host resolves the night or closes the vote. The table always moves.                                 |
| 🃏  | **Day 1, no vote** — optional house rule: the first day is discussion only, so the first elimination always has history behind it.                                               |
| ⏱️  | **Discussion timer** — configurable countdown (default 3:00) with a live ring, warning ticks, host extend/skip, and automatic vote opening on expiry.                            |
| 📷  | **QR invites + kick** — flash the code across the room; remove wrong seats from the lobby in one tap.                                                                            |
| 🔊  | **A showman in your pocket** — night drones, kill stings, vote clicks, a slamming verdict stamp and win/lose jingles. All synthesized, mutable, with haptics on the big moments. |
| 📖  | **House rules included** — a built-in How to Play card, so the one friend who doesn't know Mafia can catch up in a minute.                                                       |
| 📥  | **Installable + stays awake** — add it to the home screen (PWA), and it holds a wake lock so phones don't dim mid-discussion and miss votes.                                     |
| 🎨  | **Noir-deco looks** — gold-on-black cinema styling, spring-physics animation everywhere, bundled fonts that work offline, reduced-motion support.                                |

## 🚀 Run it

```bash
npm install
npm run dev      # serves on the network — phones on the same WiFi can join
npm test         # engine unit tests (vitest)
npm run typecheck
npm run build    # static output in dist/ — deploy anywhere (Netlify, GitHub Pages, …)
npm run check    # alias lint + prettier check
npm run fix      # alias autofix + prettier write
# CI (.github/workflows/ci.yml) runs lint, format check, typecheck, tests, and build on every push/PR.
```

- On your laptop open `http://localhost:5173`; on other phones open the
  **Network URL** Vite prints (e.g. `http://192.168.1.x:5173`).
- Devices need internet access even on the same WiFi (room setup uses PeerJS's
  free public signaling; game traffic itself is peer-to-peer).
- For play over the internet, deploy `dist/` to any static host.

## 🕸️ How it works

```
src/
├── App.tsx                 # tiny hash router:  #/ → hub,  #/<game> → game
├── hub/Hub.tsx             # landing page listing all games
├── games/registry.ts       # one entry per game → add a game by adding a line
├── games/mafia/            # moderator-free social deduction
│   ├── index.tsx           # game root: session + screen switching
│   ├── engine/             # pure game rules (state machine + tests)
│   ├── net/                # PeerJS host/client + localStorage identity
│   ├── ui/                 # one screen per phase (Home, Lobby, Night, Day, Voting, …)
│   ├── sound.ts            # synthesized sound effects (Web Audio, no files)
│   └── mafia.css           # game styles (loaded only with the game bundle)
└── games/codenames/        # team word-spy game (same architecture, own rules)
    ├── index.tsx           # game root: session + screen switching
    ├── engine/             # pure rules + original 300-word list + tests
    ├── net/                # PeerJS host/client + localStorage identity
    ├── ui/                 # Home, Lobby (teams), Table (clues + board), GameOver
    ├── sound.ts            # its own synthesized sound set
    └── codenames.css       # game styles (loaded only with the game bundle)
```

Shared across games: hub shell, `anim` motion presets, and player identity
(`src/shared/identity.ts` — one name + avatar everywhere).

The design system lives in `src/shared/` (components, session hook, sound
kit, theme tokens — see `src/shared/README.md`): one visual language for
every game, rethemable through CSS custom properties.

<details>
<summary><strong>Design decisions worth knowing</strong></summary>

- **The host's browser is the server.** It owns the full game state (including
  everyone's secret roles) and publishes a personalized `PlayerView` to each
  device — a deliberate privacy boundary in `engine/viewFor`. Raw state is
  never sent to clients. Trade-off: a curious host could peek via devtools;
  accepted for a serverless party game.
- **Hash-based routing** (`#/mafia?join=ABC123`) so the whole site works on any
  static host with zero server configuration. Invites are deep links (and QR codes).
- **Code-split per game.** Each registered game is `React.lazy`-loaded, so the
  hub stays small and adding games never slows the landing page down.
- **Sounds are synthesized** with the Web Audio API — no audio files, works
  offline. A mute toggle lives in the game top bar (preference persists).
- **Identity lives in localStorage.** Name + avatar (`ashiboy-profile`, shared
  across future games) and the current seat (`ashiboy-mafia-session`).
- **Avatars are emoji** — no image assets, easy to tell apart at a glance.
- **Imports use the `@/` alias** (enforced by `npm run lint`, readable no
  matter how deep a file lives).

</details>

> The target experience is specced in [`docs/ideal-party-flow.md`](docs/ideal-party-flow.md)
> (Mafia) and [`docs/codenames-flow.md`](docs/codenames-flow.md) (Codenames)
> — principles, the perfect game night stage by stage, and the accepted
> limitations. New features are judged against them.

## 📋 Status

Implemented and verified (`tsc`, 115 tests, production build all green):

- 🃏 Full moderator-free Mafia flow: lobby → roles → night → day → vote → win,
  with 1–4+ mafia, optional detective and doctor, suggested setups per player
  count (3–20 players).
- 📲 **Reconnects:** every seat carries a secret rejoin token. Close the tab
  mid-game, reopen, hit “Rejoin as …” and you're back with your role intact.
  Joining with an expired seat silently takes a fresh seat instead; a dead
  room says so plainly instead of stranding you. The host shows who's offline.
- ⏭️ **Anti-stall:** the host can resolve a stuck night (missing actors simply
  don't act — counts only, never names) or close a stuck vote (missing voters
  go uncounted). Discussions run on a configurable timer with host extend. The
  host can also remove wrong seats from the lobby. Day 1 can be discussion-only
  via a lobby house rule, so the first vote never happens in an information vacuum.
- 📷 **QR invites** in the lobby for instant table-wide joining.
- 🔊 **Sound effects:** night drone, kill sting, vote clicks, gavel, win/lose
  jingles, lobby join pops — all synthesized, with a mute toggle and haptic
  buzzes on role reveals, kills, votes, and wins.
- 🎲 **Names + avatars:** picked on the home screen, remembered between visits,
  shown in every player list, target grid, and ballot.
- 🎨 **Noir-deco design:** cinematic art-deco styling (Cinzel display type +
  Inter, gold-on-black with film grain), spring-physics animations throughout
  via Motion (screen transitions, tap-to-flip role reveal, newspaper day
  edition, animated ballot tally, verdict stamp, winner rays), bundled fonts
  that work offline, and `prefers-reduced-motion` support.
- ♿ **Screen-reader announcements** of every phase change, and a wake lock so
  screens never sleep mid-game. UI screens covered by interaction tests.
- 🕵️ **Codenames is live:** team lobby with spymaster starring, secret-key
  dealing from an original 300-word list, clue composer (0–9 + ∞), tap-to-guess
  board with plus-one/assassin/opponent-win rules, turn timer, rematch with
  fresh boards.

Known limitations (deliberate for now):

- The host's tab _is_ the room. If the host closes it, the game ends for
  everyone (guests are told the room is gone — their seats can't be reclaimed).
- No discussion facilitation — the table self-moderates out loud (a configurable timer keeps it moving).
- No in-app chat — discussion happens out loud (it's a room game).
- One detective and one doctor max; no extra special roles.

<details>
<summary><strong>Ideas for next steps</strong> (not started)</summary>

- Game #3 on the hub via `src/games/<name>/` + one registry line.
- Host resume (persist state so a dropped host can reclaim the room).
- Custom rule toggles (e.g. doctor self-save limits, majority-vs-plurality lynch).

</details>

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:3A1420,100:0B0B10&height=120&section=footer" alt="" width="100%" />

_Deceive your friends. Lovingly._ 🃏

</div>
